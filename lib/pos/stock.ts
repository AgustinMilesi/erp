import "server-only";
import { db } from "@/lib/db";
import { PosError } from "@/lib/pos/errors";
import type { Actor } from "@/lib/pos/sales";

// Adds or removes units by hand: a delivery from a supplier, or a correction
// after counting the shelf. Every change leaves a movement behind.
export async function adjustStock(
  actor: Actor,
  input: { productId: string; kind: "RESTOCK" | "ADJUSTMENT"; quantity: number; reason?: string },
) {
  const { organizationId, userId } = actor;

  return db.$transaction(async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { allowNegativeStock: true },
    });

    const product = await tx.product.findFirst({
      where: { id: input.productId, organizationId },
      select: { id: true, name: true, trackStock: true },
    });
    if (!product) throw new PosError("We couldn't find that product.");
    if (!product.trackStock) throw new PosError("This product doesn't track stock.");

    // For a removal the update only matches when there are enough units left
    const changed = await tx.product.updateMany({
      where: {
        id: product.id,
        organizationId,
        ...(input.quantity < 0 && !org.allowNegativeStock ? { stock: { gte: -input.quantity } } : {}),
      },
      data: { stock: { increment: input.quantity } },
    });
    if (changed.count === 0) throw new PosError("There aren't that many units to take away.");

    await tx.stockMovement.create({
      data: {
        organizationId,
        productId: product.id,
        userId,
        type: input.kind,
        quantity: input.quantity,
        reason: input.reason?.trim() || null,
      },
    });
  });
}
