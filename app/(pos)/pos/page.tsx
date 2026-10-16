import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/Headline";
import { SubmitButton } from "@/components/SubmitButton";
import { PosTerminal } from "@/components/pos/PosTerminal";
import { ui } from "@/components/ui";
import { openRegister } from "@/app/actions/pos";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Point of sale" };

export default async function PosPage() {
  const { organization, role } = await requireSession();

  const [open, org] = await Promise.all([
    db.cashSession.findFirst({
      where: { organizationId: organization.id, status: "OPEN" },
      select: { id: true },
    }),
    db.organization.findUniqueOrThrow({
      where: { id: organization.id },
      select: { currency: true, allowNegativeStock: true },
    }),
  ]);

  if (!open) {
    return (
      <div className="p-6 md:p-12 max-w-xl space-y-10">
        <PageTitle light="Open the" bold="register." />
        <p className={ui.muted}>
          Count the cash in the drawer and enter it to start selling. You can close the register at any time from the{" "}
          <Link href="/app/cash" className={ui.link}>Cash</Link> page.
        </p>
        <ActionForm action={openRegister} keepValues className="space-y-2">
          <div>
            <label htmlFor="opening" className={ui.label}>Cash in the drawer</label>
            <input id="opening" name="opening" inputMode="decimal" placeholder="0,00" autoFocus className={ui.input} />
          </div>
          <div>
            <label htmlFor="note" className={ui.label}>Note (optional)</label>
            <input id="note" name="note" maxLength={200} className={ui.input} />
          </div>
          <div className="pt-6"><SubmitButton pendingText="Opening...">Open register</SubmitButton></div>
        </ActionForm>
      </div>
    );
  }

  return (
    <PosTerminal
      currency={org.currency}
      allowNegativeStock={org.allowNegativeStock}
      canDiscount={canManage(role)}
    />
  );
}
