import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Receipt" };

const METHOD_LABEL = { CASH: "Cash", CARD: "Card", TRANSFER: "Transfer", OTHER: "Other" } as const;

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { organization } = await requireSession();
  const { id } = await params;

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

      <article className="w-full max-w-sm bg-white text-black p-6 font-mono text-sm space-y-4 rounded-lg print:rounded-none print:max-w-none">
        <header className="text-center space-y-1">
          <p className="text-base font-bold">{org.name}</p>
          <p>Sale #{sale.number}</p>
          <p>{formatDate(sale.createdAt)}</p>
          {sale.status === "VOIDED" && <p className="font-bold text-lg">— VOIDED —</p>}
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
              <div className="flex justify-between"><span>Subtotal</span><span>{money(sale.subtotalCents)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>− {money(sale.discountCents)}</span></div>
            </>
          )}
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(sale.totalCents)}</span></div>
          <div className="flex justify-between text-black/60"><span>Tax included</span><span>{money(sale.taxCents)}</span></div>
        </div>

        <div className="border-t border-dashed border-black/40 pt-3 space-y-1">
          {sale.payments.map((payment) => (
            <div key={payment.id} className="flex justify-between">
              <span>{METHOD_LABEL[payment.method]}</span>
              <span>{money(payment.amountCents)}</span>
            </div>
          ))}
          {Number(sale.changeCents) > 0 && (
            <div className="flex justify-between"><span>Change</span><span>{money(sale.changeCents)}</span></div>
          )}
        </div>

        <footer className="border-t border-dashed border-black/40 pt-3 text-center text-black/60 space-y-1">
          <p>Served by {sale.cashier.name}</p>
          {sale.contact && <p>Customer: {sale.contact.name}</p>}
          <p>This is not a tax invoice.</p>
        </footer>
      </article>
    </div>
  );
}
