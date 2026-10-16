import "server-only";
import { Prisma, type Role } from "@prisma/client";
import { db } from "@/lib/db";
import { canManage } from "@/lib/auth/session";
import { PosError } from "@/lib/pos/errors";
import { lockOpenSession, lockSessionIfOpen, type Tx } from "@/lib/pos/locks";
import { allocatePayments, computeTotals } from "@/lib/pos/sale-math";
import type { SaleInput } from "@/lib/validation";

export type Actor = { organizationId: string; userId: string; role: Role };

const TX_OPTIONS = { maxWait: 8_000, timeout: 20_000 } as const;

const isUniqueError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

// Records a sale: checks prices against the catalog, takes stock, saves the
// payments and numbers the sale, all in one transaction. If anything fails,
// nothing is saved.
export async function completeSale(actor: Actor, input: SaleInput) {
  try {
    return await db.$transaction((tx) => runSale(tx, actor, input), TX_OPTIONS);
  } catch (error) {
    // Two requests with the same key at the same time: the second one lands here.
    if (isUniqueError(error)) {
      const existing = await findByKey(db, actor.organizationId, input.idempotencyKey);
      if (existing) return { id: existing.id, number: existing.number, duplicate: true };
    }
    throw error;
  }
}

const findByKey = (client: Tx, organizationId: string, idempotencyKey: string) =>
  client.sale.findUnique({
    where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
    select: { id: true, number: true, totalCents: true },
  });

async function runSale(tx: Tx, actor: Actor, input: SaleInput) {
  const { organizationId, userId } = actor;

  const previous = await findByKey(tx, organizationId, input.idempotencyKey);
  if (previous) {
    if (previous.totalCents !== BigInt(input.expectedTotalCents)) {
      throw new PosError("That sale was already recorded with a different total. Start a new sale.");
    }
    return { id: previous.id, number: previous.number, duplicate: true };
  }

  const sessionId = await lockOpenSession(tx, organizationId, "share");
  if (!sessionId) throw new PosError("Open the cash register before selling.");

  if (input.discountCents > 0 && !canManage(actor.role)) {
    throw new PosError("Only owners and admins can give discounts.");
  }

  if (input.contactId) {
    const contact = await tx.contact.findFirst({
      where: { id: input.contactId, organizationId },
      select: { id: true },
    });
    if (!contact) throw new PosError("That customer doesn't exist anymore.");
  }

  const org = await tx.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { allowNegativeStock: true },
  });

  // The same product twice in the cart becomes one line
  const wanted = new Map<string, number>();
  for (const item of input.items) {
    wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
  }

  const products = await tx.product.findMany({
    where: { id: { in: [...wanted.keys()] }, organizationId, active: true },
  });
  if (products.length !== wanted.size) {
    throw new PosError("A product in the cart isn't available anymore. Review the cart.");
  }

  // Stock is taken in a fixed order, so two sales sharing products can't deadlock
  const lines = products
    .map((product) => ({ product, quantity: wanted.get(product.id) ?? 0 }))
    .sort((a, b) => (a.product.id < b.product.id ? -1 : 1));

  const priced = lines.map(({ product, quantity }) => ({
    unitPriceCents: Number(product.priceCents),
    quantity,
    taxRateBp: product.taxRateBp,
  }));
  const totals = computeTotals(priced, input.discountCents);

  if (!Number.isSafeInteger(totals.subtotalCents)) throw new PosError("This sale is too large.");
  if (input.discountCents > totals.subtotalCents) throw new PosError("The discount is more than the sale.");
  if (totals.totalCents !== input.expectedTotalCents) {
    throw new PosError("Prices changed while you were selling. Review the cart and charge again.");
  }

  const allocation = allocatePayments(
    totals.totalCents,
    input.payments.map((p) => ({ method: p.method, amountCents: p.amountCents })),
  );
  if (!allocation.ok) throw new PosError(allocation.error);

  for (const { product, quantity } of lines) {
    if (!product.trackStock) continue;
    const taken = await tx.product.updateMany({
      where: {
        id: product.id,
        organizationId,
        ...(org.allowNegativeStock ? {} : { stock: { gte: quantity } }),
      },
      data: { stock: { decrement: quantity } },
    });
    if (taken.count === 0) throw new PosError(`Not enough stock of "${product.name}".`);
  }

  // The counter row is locked until the end of the transaction, so numbers never repeat
  const { saleCounter } = await tx.organization.update({
    where: { id: organizationId },
    data: { saleCounter: { increment: 1 } },
    select: { saleCounter: true },
  });

  const sale = await tx.sale.create({
    data: {
      organizationId,
      sessionId,
      cashierId: userId,
      contactId: input.contactId ?? null,
      number: saleCounter,
      subtotalCents: BigInt(totals.subtotalCents),
      discountCents: BigInt(totals.discountCents),
      totalCents: BigInt(totals.totalCents),
      taxCents: BigInt(totals.taxCents),
      changeCents: BigInt(allocation.changeCents),
      note: input.note?.trim() || null,
      idempotencyKey: input.idempotencyKey,
      items: {
        create: lines.map(({ product, quantity }, i) => ({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity,
          unitPriceCents: product.priceCents,
          taxRateBp: product.taxRateBp,
          totalCents: BigInt(totals.lineTotals[i]),
        })),
      },
      payments: {
        create: allocation.payments.map((p) => ({ method: p.method, amountCents: BigInt(p.amountCents) })),
      },
    },
    select: { id: true, number: true },
  });

  const tracked = lines.filter(({ product }) => product.trackStock);
  if (tracked.length > 0) {
    await tx.stockMovement.createMany({
      data: tracked.map(({ product, quantity }) => ({
        organizationId,
        productId: product.id,
        userId,
        type: "SALE" as const,
        quantity: -quantity,
        saleId: sale.id,
      })),
    });
  }

  return { id: sale.id, number: sale.number, duplicate: false };
}

// Cancels a sale and puts its stock back. Only possible while the cash session
// it belongs to is still open, because after closing the money has been counted.
export async function voidSale(actor: Actor, saleId: string, reason: string) {
  if (!canManage(actor.role)) throw new PosError("Only owners and admins can void a sale.");
  const { organizationId, userId } = actor;

  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, organizationId },
      include: { items: true },
    });
    if (!sale) throw new PosError("We couldn't find that sale.");
    if (sale.status === "VOIDED") throw new PosError("That sale is already voided.");

    const open = await lockSessionIfOpen(tx, organizationId, sale.sessionId);
    if (!open) {
      throw new PosError("That sale belongs to a closed cash register, so it can't be voided anymore.");
    }

    // The status check in the update makes sure two people can't void it twice
    const flipped = await tx.sale.updateMany({
      where: { id: sale.id, organizationId, status: "COMPLETED" },
      data: { status: "VOIDED", voidedAt: new Date(), voidedById: userId, voidReason: reason },
    });
    if (flipped.count === 0) throw new PosError("That sale is already voided.");

    const back = new Map<string, number>();
    for (const item of sale.items) {
      if (item.productId) back.set(item.productId, (back.get(item.productId) ?? 0) + item.quantity);
    }

    for (const productId of [...back.keys()].sort()) {
      const quantity = back.get(productId) ?? 0;
      const restored = await tx.product.updateMany({
        where: { id: productId, organizationId, trackStock: true },
        data: { stock: { increment: quantity } },
      });
      if (restored.count === 1) {
        await tx.stockMovement.create({
          data: {
            organizationId,
            productId,
            userId,
            type: "VOID",
            quantity,
            saleId: sale.id,
            reason: `Sale #${sale.number} voided`,
          },
        });
      }
    }

    return { number: sale.number };
  }, TX_OPTIONS);
}
