"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/action";
import { canManage, requireSession } from "@/lib/auth/session";

export async function saveExpense(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail("Only admins can record expenses.");

  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "General").trim();
  const dateStr = String(formData.get("date") || "");
  const amountRaw = parseFloat(String(formData.get("amount") || "0").replace(/[^0-9.]/g, ""));
  const amountCents = BigInt(Math.max(0, Math.round(amountRaw * 100)));

  if (!description) return fail("La descripción o concepto es requerido.");
  if (amountCents <= BigInt(0)) return fail("El monto debe ser mayor a cero.");

  const date = dateStr ? new Date(dateStr) : new Date();

  await db.expense.create({
    data: {
      organizationId: organization.id,
      description,
      category,
      amountCents,
      date,
    },
  });

  revalidatePath("/app/expenses");
  return ok("Gasto / Factura registrado con éxito.");
}

export async function deleteExpense(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail("Only admins can delete expenses.");

  const id = String(formData.get("id") || "");
  await db.expense.deleteMany({
    where: { id, organizationId: organization.id },
  });

  revalidatePath("/app/expenses");
  return ok("Gasto eliminado.");
}
