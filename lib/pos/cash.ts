import "server-only";
import { Prisma, type PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { canManage } from "@/lib/auth/session";
import { PosError } from "@/lib/pos/errors";
import { lockOpenSession, lockTill, type Tx } from "@/lib/pos/locks";
import type { Actor } from "@/lib/pos/sales";

const TX_OPTIONS = { maxWait: 8_000, timeout: 20_000 } as const;

export type SessionSummary = {
  openingCents: number;
  salesCount: number;
  voidedCount: number;
  totalSalesCents: number;
  byMethod: Record<PaymentMethod, number>;
  cashInCents: number;
  cashOutCents: number;
  // Cash that should be in the drawer: opening + cash sales + money in - money out
  expectedCashCents: number;
};

// Everything the cash report needs, for one session. Voided sales don't count.
export async function sessionSummary(
  client: Tx,
  organizationId: string,
  sessionId: string,
): Promise<SessionSummary | null> {
  const session = await client.cashSession.findFirst({
    where: { id: sessionId, organizationId },
    select: { openingCents: true },
  });
  if (!session) return null;

  const [payments, sales, voided, movements] = await Promise.all([
    client.payment.groupBy({
      by: ["method"],
      where: { sale: { sessionId, organizationId, status: "COMPLETED" } },
      _sum: { amountCents: true },
    }),
    client.sale.aggregate({
      where: { sessionId, organizationId, status: "COMPLETED" },
      _count: true,
      _sum: { totalCents: true },
    }),
    client.sale.count({ where: { sessionId, organizationId, status: "VOIDED" } }),
    client.cashMovement.groupBy({
      by: ["type"],
      where: { sessionId, organizationId },
      _sum: { amountCents: true },
    }),
  ]);

  const byMethod: Record<PaymentMethod, number> = { CASH: 0, CARD: 0, TRANSFER: 0, OTHER: 0 };
  for (const row of payments) byMethod[row.method] = Number(row._sum.amountCents ?? 0);

  const moved = (type: "IN" | "OUT") =>
    Number(movements.find((m) => m.type === type)?._sum.amountCents ?? 0);
  const cashIn = moved("IN");
  const cashOut = moved("OUT");
  const opening = Number(session.openingCents);

  return {
    openingCents: opening,
    salesCount: sales._count,
    voidedCount: voided,
    totalSalesCents: Number(sales._sum.totalCents ?? 0),
    byMethod,
    cashInCents: cashIn,
    cashOutCents: cashOut,
    expectedCashCents: opening + byMethod.CASH + cashIn - cashOut,
  };
}

export async function openSession(actor: Actor, openingCents: number, note?: string) {
  const { organizationId, userId } = actor;

  return db.$transaction(async (tx) => {
    // Two people opening at once take turns, and nobody can sell while it happens
    await lockTill(tx, organizationId, "exclusive");

    const open = await tx.cashSession.findFirst({
      where: { organizationId, status: "OPEN" },
      select: { id: true },
    });
    if (open) throw new PosError("There is already an open cash register.");

    return tx.cashSession.create({
      data: { organizationId, openedById: userId, openingCents: BigInt(openingCents), note: note?.trim() || null },
      select: { id: true },
    });
  }, TX_OPTIONS);
}

export async function closeSession(actor: Actor, sessionId: string, countedCents: number, note?: string) {
  const { organizationId, userId } = actor;

  return db.$transaction(async (tx) => {
    const lockedId = await lockOpenSession(tx, organizationId, "exclusive");
    if (!lockedId || lockedId !== sessionId) throw new PosError("That cash register is already closed.");

    const session = await tx.cashSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: { openedById: true },
    });
    if (session.openedById !== userId && !canManage(actor.role)) {
      throw new PosError("Only the person who opened the register, or an admin, can close it.");
    }

    const summary = await sessionSummary(tx, organizationId, sessionId);
    if (!summary) throw new PosError("We couldn't find that cash register.");

    await tx.cashSession.update({
      where: { id: sessionId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedById: userId,
        countedCents: BigInt(countedCents),
        expectedCents: BigInt(summary.expectedCashCents),
        ...(note?.trim() ? { note: note.trim() } : {}),
      },
    });

    return { expectedCents: summary.expectedCashCents, differenceCents: countedCents - summary.expectedCashCents };
  }, TX_OPTIONS);
}

export async function addCashMovement(
  actor: Actor,
  input: { type: "IN" | "OUT"; amountCents: number; reason: string },
) {
  const { organizationId, userId } = actor;

  return db.$transaction(async (tx) => {
    const sessionId = await lockOpenSession(tx, organizationId, "share");
    if (!sessionId) throw new PosError("Open the cash register first.");

    if (input.type === "OUT") {
      const summary = await sessionSummary(tx, organizationId, sessionId);
      if (summary && input.amountCents > summary.expectedCashCents) {
        throw new PosError("There isn't that much cash in the drawer.");
      }
    }

    await tx.cashMovement.create({
      data: {
        organizationId,
        sessionId,
        userId,
        type: input.type,
        amountCents: BigInt(input.amountCents),
        reason: input.reason,
      },
    });
  }, TX_OPTIONS);
}

export const isPrismaUnique = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
