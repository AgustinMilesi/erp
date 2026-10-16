import "server-only";
import type { Prisma } from "@prisma/client";

export type Tx = Prisma.TransactionClient;

// Fixed namespace so these locks never collide with anything else using advisory locks
const NAMESPACE = 7101;

// Sales, voids and cash movements take the workspace's till lock in shared mode,
// so many can run together. Opening and closing the register take it exclusively:
// they wait for whatever is in flight and keep newcomers out until they finish.
//
// An advisory lock is used instead of a row lock on purpose. Postgres queues these
// fairly, so a steady stream of sales can't keep the closing waiting forever.
// The lock is released on its own when the transaction ends.
export async function lockTill(tx: Tx, organizationId: string, mode: "share" | "exclusive") {
  if (mode === "share") {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(${NAMESPACE}::int, hashtext(${organizationId}))`;
  } else {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${NAMESPACE}::int, hashtext(${organizationId}))`;
  }
}

// Locks the till and returns the id of the open cash session, if there is one.
export async function lockOpenSession(tx: Tx, organizationId: string, mode: "share" | "exclusive") {
  await lockTill(tx, organizationId, mode);
  const open = await tx.cashSession.findFirst({
    where: { organizationId, status: "OPEN" },
    select: { id: true },
  });
  return open?.id ?? null;
}

// Same idea for one specific session, used when voiding an old sale.
export async function lockSessionIfOpen(tx: Tx, organizationId: string, sessionId: string) {
  await lockTill(tx, organizationId, "share");
  const session = await tx.cashSession.findFirst({
    where: { id: sessionId, organizationId, status: "OPEN" },
    select: { id: true },
  });
  return session !== null;
}
