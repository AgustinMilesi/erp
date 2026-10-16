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

import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Point of sale" };

export default async function PosPage() {
  const [{ organization, role }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);

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
        <PageTitle light={t.openRegisterTitle} bold="." />
        <p className={ui.muted}>
          {t.openRegisterSubtitle} (
          <Link href="/app/cash" className={ui.link}>{t.cash}</Link>).
        </p>
        <ActionForm action={openRegister} keepValues className="space-y-2">
          <div>
            <label htmlFor="opening" className={ui.label}>{t.initialCashLabel}</label>
            <input id="opening" name="opening" inputMode="decimal" placeholder="0,00" autoFocus className={ui.input} />
          </div>
          <div>
            <label htmlFor="note" className={ui.label}>{t.notes}</label>
            <input id="note" name="note" maxLength={200} className={ui.input} />
          </div>
          <div className="pt-6"><SubmitButton pendingText={t.saving}>{t.openRegisterAction}</SubmitButton></div>
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
