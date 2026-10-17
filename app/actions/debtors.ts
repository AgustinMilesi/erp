"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/action";
import { canManage, requireSession } from "@/lib/auth/session";

export async function saveDebtor(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail("Only admins can manage debtors.");

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!name) return fail("El nombre es requerido.");

  await db.debtor.create({
    data: {
      organizationId: organization.id,
      name,
      phone,
      notes,
    },
  });

  revalidatePath("/app/debtors");
  return ok("Cliente deudor creado con éxito.");
}

export async function addDebtorItem(formData: FormData): Promise<ActionResult> {
  const { organization } = await requireSession();
  const debtorId = String(formData.get("debtorId") || "");
  const productName = String(formData.get("productName") || "").trim();
  const quantity = Math.max(1, parseInt(String(formData.get("quantity") || "1"), 10));
  const priceRaw = parseFloat(String(formData.get("price") || "0").replace(/[^0-9.]/g, ""));
  const unitPriceCents = BigInt(Math.max(0, Math.round(priceRaw * 100)));
  const totalCents = unitPriceCents * BigInt(quantity);

  if (!debtorId || !productName) return fail("Datos incompletos.");

  const debtor = await db.debtor.findFirst({
    where: { id: debtorId, organizationId: organization.id },
  });
  if (!debtor) return fail("Cliente no encontrado.");

  await db.debtorItem.create({
    data: {
      debtorId,
      productName,
      quantity,
      unitPriceCents,
      totalCents,
    },
  });

  revalidatePath("/app/debtors");
  revalidatePath(`/app/debtors/${debtorId}`);
  return ok("Ítem fiado agregado a la cuenta.");
}

export async function registerDebtorPayment(formData: FormData): Promise<ActionResult> {
  const { organization } = await requireSession();
  const debtorId = String(formData.get("debtorId") || "");
  const amountRaw = parseFloat(String(formData.get("amount") || "0").replace(/[^0-9.]/g, ""));
  const amountCents = BigInt(Math.max(0, Math.round(amountRaw * 100)));
  const note = String(formData.get("note") || "").trim() || null;

  if (!debtorId || amountCents <= BigInt(0)) return fail("Monto de pago inválido.");

  const debtor = await db.debtor.findFirst({
    where: { id: debtorId, organizationId: organization.id },
    include: { items: { orderBy: { addedAt: "asc" } } },
  });
  if (!debtor) return fail("Cliente no encontrado.");

  // Record payment in audit log
  await db.debtorPayment.create({
    data: {
      debtorId,
      amountCents,
      note,
    },
  });

  // Pay off items FIFO (as done in MariERP)
  let availablePayment = amountCents;
  for (const item of debtor.items) {
    if (availablePayment <= BigInt(0)) break;

    if (availablePayment >= item.totalCents) {
      availablePayment -= item.totalCents;
      await db.debtorItem.delete({ where: { id: item.id } });
    } else if (item.quantity > 1 && item.unitPriceCents > BigInt(0)) {
      const unitsToPay = availablePayment / item.unitPriceCents;
      if (unitsToPay > BigInt(0)) {
        const costToDeduct = unitsToPay * item.unitPriceCents;
        availablePayment -= costToDeduct;
        await db.debtorItem.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity - Number(unitsToPay),
            totalCents: item.totalCents - costToDeduct,
          },
        });
      }
      break;
    } else {
      break;
    }
  }

  // Any surplus goes to saldoFavorCents
  if (availablePayment > BigInt(0)) {
    await db.debtor.update({
      where: { id: debtorId },
      data: { saldoFavorCents: debtor.saldoFavorCents + availablePayment },
    });
  }

  revalidatePath("/app/debtors");
  return ok("Pago registrado y cuenta actualizada.");
}

export async function removeDebtorItem(formData: FormData): Promise<ActionResult> {
  const { organization } = await requireSession();
  const itemId = String(formData.get("itemId") || "");

  const item = await db.debtorItem.findFirst({
    where: { id: itemId, debtor: { organizationId: organization.id } },
  });
  if (!item) return fail("Ítem no encontrado.");

  await db.debtorItem.delete({ where: { id: itemId } });
  revalidatePath("/app/debtors");
  return ok("Ítem eliminado de la cuenta.");
}

export async function clearDebtorDebt(formData: FormData): Promise<ActionResult> {
  const { organization } = await requireSession();
  const debtorId = String(formData.get("debtorId") || "");

  const debtor = await db.debtor.findFirst({
    where: { id: debtorId, organizationId: organization.id },
  });
  if (!debtor) return fail("Cliente no encontrado.");

  await db.debtorItem.deleteMany({ where: { debtorId } });
  await db.debtor.update({
    where: { id: debtorId },
    data: { saldoFavorCents: BigInt(0) },
  });

  revalidatePath("/app/debtors");
  return ok("Cuenta saldada y vaciada por completo.");
}

export async function deleteDebtor(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail("Only admins can delete debtors.");

  const id = String(formData.get("id") || "");
  await db.debtor.deleteMany({
    where: { id, organizationId: organization.id },
  });

  revalidatePath("/app/debtors");
  return ok("Cliente deudor eliminado.");
}
