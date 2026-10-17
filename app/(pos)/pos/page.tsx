import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PosTerminal } from "@/components/pos/PosTerminal";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Point of sale" };

export default async function PosPage() {
  const { organization, role } = await requireSession();

  const [open, org, debtors] = await Promise.all([
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

  if (!open) {
    redirect("/app/cash");
  }

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
