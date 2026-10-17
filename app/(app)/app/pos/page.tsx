import type { Metadata } from "next";
import { PosTerminal } from "@/components/pos/PosTerminal";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Punto de Venta" };

export default async function IntegratedPosPage() {
  const { organization, role, user } = await requireSession();

  const [existingOpen, org, debtors] = await Promise.all([
    db.cashSession.findFirst({
      where: { organizationId: organization.id, status: "OPEN" },
      select: { id: true },
    }),
    db.organization.findUniqueOrThrow({
      where: { id: organization.id },
      select: { currency: true, showDecimals: true, allowNegativeStock: true },
    }),
    db.debtor.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, saldoFavorCents: true },
    }),
  ]);

  const open =
    existingOpen ??
    (await db.cashSession.create({
      data: {
        organizationId: organization.id,
        openedById: user.id,
        status: "OPEN",
        openingCents: BigInt(0),
        note: "Turno iniciado automáticamente desde el Punto de Venta",
      },
      select: { id: true },
    }));

  return (
    <PosTerminal
      currency={org.currency}
      showDecimals={org.showDecimals}
      allowNegativeStock={org.allowNegativeStock}
      canDiscount={canManage(role)}
      debtors={debtors.map((d) => ({
        id: d.id,
        name: d.name,
        saldoFavorCents: Number(d.saldoFavorCents),
      }))}
    />
  );
}
