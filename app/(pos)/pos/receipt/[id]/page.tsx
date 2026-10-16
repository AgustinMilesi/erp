import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ organization }, { t }] = await Promise.all([
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

  const [sale, org] = await Promise.all([
    db.sale.findFirst({
      where: { id, organizationId: organization.id },
      include: {
        items: { orderBy: { name: "asc" } },
        payments: true,
        cashier: { select: { name: true } },
        contact: { select: { name: true } },
      },
    }),
    db.organization.findUniqueOrThrow({
      where: { id: organization.id },
      select: { name: true, currency: true },
    }),
  ]);
  if (!sale) notFound();

  const money = (cents: bigint | number) => formatMoney(cents, org.currency);

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      <div className="print:hidden"><PrintButton /></div>

      <style dangerouslySetInnerHTML={{ __html: `
        :root { --ticket-width: 80mm; }
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .thermal-ticket {
            width: var(--ticket-width, 80mm) !important;
            max-width: var(--ticket-width, 80mm) !important;
            padding: 4mm !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}} />

      <article className="thermal-ticket w-full max-w-[340px] bg-white text-black p-6 font-mono text-xs sm:text-sm space-y-4 rounded-lg shadow-2xl">
        <header className="text-center space-y-1">
          <p className="text-base font-bold tracking-tight">{org.name}</p>
          <p className="font-semibold">{t.saleNumber}{sale.number}</p>
          <p className="text-xs text-black/70">{formatDate(sale.createdAt)}</p>
          {sale.status === "VOIDED" && <p className="font-bold text-base text-black border border-black py-0.5 my-1">— {t.voidedBadge.toUpperCase()} —</p>}
        </header>

        <ul className="border-y border-dashed border-black/40 py-3 space-y-2">
          {sale.items.map((item) => (
            <li key={item.id}>
              <div className="flex justify-between gap-3">
                <span className="break-words min-w-0">{item.name}</span>
                <span className="whitespace-nowrap">{money(item.totalCents)}</span>
              </div>
              <div className="text-black/60">{item.quantity} × {money(item.unitPriceCents)}</div>
            </li>
          ))}
        </ul>

        <div className="space-y-1">
          {Number(sale.discountCents) > 0 && (
            <>
              <div className="flex justify-between"><span>{t.subtotal}</span><span>{money(sale.subtotalCents)}</span></div>
              <div className="flex justify-between"><span>{t.discount}</span><span>− {money(sale.discountCents)}</span></div>
            </>
          )}
          <div className="flex justify-between text-base font-bold"><span>{t.total}</span><span>{money(sale.totalCents)}</span></div>
        </div>

        <div className="border-t border-dashed border-black/40 pt-3 space-y-1">
          {sale.payments.map((payment) => (
            <div key={payment.id} className="flex justify-between">
              <span>{methodLabel[payment.method] || payment.method}</span>
              <span>{money(payment.amountCents)}</span>
            </div>
          ))}
          {Number(sale.changeCents) > 0 && (
            <div className="flex justify-between"><span>{t.changeToReturn}</span><span>{money(sale.changeCents)}</span></div>
          )}
        </div>

        <footer className="border-t border-dashed border-black/40 pt-3 text-center text-black/60 space-y-1">
          <p>{t.receiptCashier} {sale.cashier.name}</p>
          {sale.contact && <p>{t.receiptCustomer} {sale.contact.name}</p>}
          <p>{t.receiptThanks}</p>
        </footer>
      </article>
    </div>
  );
}
