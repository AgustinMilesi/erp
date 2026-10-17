import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { voidSaleAction } from "@/app/actions/pos";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Sale" };

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ organization, role }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const { id } = await params;

  const methodLabel: Record<string, string> = {
    CASH: t.methodCash,
    CARD: t.methodCard,
    TRANSFER: t.methodTransfer,
    OTHER: t.methodOther,
  };

  const sale = await db.sale.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      items: { orderBy: { name: "asc" } },
      payments: true,
      cashier: { select: { name: true } },
      voidedBy: { select: { name: true } },
      contact: { select: { id: true, name: true } },
      session: { select: { status: true } },
    },
  });
  if (!sale) notFound();

  const money = (cents: bigint | number) => formatMoney(cents, organization.currency);
  const canVoid = canManage(role) && sale.status === "COMPLETED" && sale.session.status === "OPEN";

  return (
    <div className="space-y-12">
      <Link href="/app/sales" className={`${ui.muted} text-sm hover:text-rose-400 transition`}>
        ← {t.backToSales}
      </Link>

      <div className="space-y-2">
        <h1 className="text-4xl font-black text-white leading-tight">
          {t.saleNumber}{sale.number}
          {sale.status === "VOIDED" && <span className="ml-3 text-lg font-normal text-rose-400 uppercase tracking-wider">{t.voidedBadge}</span>}
        </h1>
        <p className={ui.muted}>
          {formatDate(sale.createdAt)} · {sale.cashier.name}
          {sale.contact && (
            <>
              {" · "}
              <Link href={`/app/contacts/${sale.contact.id}`} className={ui.link}>{sale.contact.name}</Link>
            </>
          )}
        </p>
      </div>

      <section className="space-y-4">
        <p className={ui.label}>{t.items}</p>
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {sale.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="block text-white break-words">{item.name}</span>
                <span className="block text-sm text-slate-500">
                  {item.quantity >= 50 ? `${item.quantity}gr` : `${item.quantity}u.`} × {money(item.unitPriceCents)}{item.quantity >= 50 ? " /kg" : ""} · {item.sku}
                </span>
              </span>
              <span className="text-white whitespace-nowrap">{money(item.totalCents)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 pt-2">
          {Number(sale.discountCents) > 0 && (
            <>
              <div className="flex justify-between text-slate-400"><span>{t.subtotal}</span><span>{money(sale.subtotalCents)}</span></div>
              <div className="flex justify-between text-slate-400"><span>{t.discount}</span><span>− {money(sale.discountCents)}</span></div>
            </>
          )}
          <div className="flex justify-between text-2xl text-white font-black"><span>{t.total}</span><span>{money(sale.totalCents)}</span></div>
        </div>
      </section>

      <section className="space-y-4">
        <p className={ui.label}>{t.payments}</p>
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {sale.payments.map((payment) => (
            <li key={payment.id} className="flex justify-between py-3 text-slate-200">
              <span>{methodLabel[payment.method] || payment.method}</span>
              <span>{money(payment.amountCents)}</span>
            </li>
          ))}
        </ul>
        {Number(sale.changeCents) > 0 && <p className={ui.muted}>{t.giveBack}: {money(sale.changeCents)}</p>}
      </section>

      {sale.status === "VOIDED" && (
        <section className={`${ui.card} p-6 space-y-1`}>
          <p className={ui.label}>{t.voidedBadge}</p>
          <p className="text-slate-200">{sale.voidReason}</p>
          <p className="text-sm text-slate-500">
            {sale.voidedAt ? formatDate(sale.voidedAt) : ""}
            {sale.voidedBy ? ` · ${sale.voidedBy.name}` : ""}
          </p>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href={`/pos/receipt/${sale.id}`} target="_blank" className={ui.ghost}>{t.receipt}</Link>
      </div>

      {canVoid && (
        <section className="space-y-4">
          <p className={ui.label}>{t.voidSale}</p>
          <p className={ui.muted}>{t.confirmVoidSale}</p>
          <ActionForm action={voidSaleAction} confirm={t.confirmVoidSale} className="space-y-2">
            <input type="hidden" name="id" value={sale.id} />
            <div>
              <label className={ui.label} htmlFor="void-reason">{t.notes}</label>
              <input id="void-reason" name="reason" required minLength={3} maxLength={200} className={ui.input} />
            </div>
            <div className="pt-6"><SubmitButton variant="danger" pendingText="...">{t.voidSale}</SubmitButton></div>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
