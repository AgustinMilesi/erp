import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/Headline";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { closeRegister, moveCash, openRegister } from "@/app/actions/pos";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { sessionSummary } from "@/lib/pos/cash";

export const metadata: Metadata = { title: "Cash" };

const METHODS = [
  { key: "CASH", label: "Cash" },
  { key: "CARD", label: "Card" },
  { key: "TRANSFER", label: "Transfer" },
  { key: "OTHER", label: "Other" },
] as const;

export default async function CashPage() {
  const { organization } = await requireSession();
  const money = (cents: number | bigint) => formatMoney(cents, organization.currency);

  const [open, history] = await Promise.all([
    db.cashSession.findFirst({
      where: { organizationId: organization.id, status: "OPEN" },
      include: {
        openedBy: { select: { name: true } },
        movements: { orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
      },
    }),
    db.cashSession.findMany({
      where: { organizationId: organization.id, status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      take: 15,
      select: { id: true, openedAt: true, closedAt: true, expectedCents: true, countedCents: true, openedBy: { select: { name: true } } },
    }),
  ]);

  const summary = open ? await sessionSummary(db, organization.id, open.id) : null;

  return (
    <div className="space-y-14">
      <PageTitle light="Your" bold="cash." />

      {open && summary ? (
        <>
          <section className="space-y-6">
            <div className="space-y-1">
              <p className={ui.label}>Open register</p>
              <p className={ui.muted}>
                Opened {formatDate(open.openedAt)} by {open.openedBy.name}. <Link href="/pos" className={ui.link}>Go to the till</Link>
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className={`${ui.card} p-6`}>
                <p className={ui.label}>Sales</p>
                <p className="text-3xl font-light text-white">{money(summary.totalSalesCents)}</p>
                <p className="text-sm text-slate-500">{summary.salesCount} sold{summary.voidedCount > 0 ? `, ${summary.voidedCount} voided` : ""}</p>
              </div>
              <div className={`${ui.card} p-6`}>
                <p className={ui.label}>Cash expected</p>
                <p className="text-3xl font-light text-white">{money(summary.expectedCashCents)}</p>
                <p className="text-sm text-slate-500">Opening {money(summary.openingCents)}</p>
              </div>
              <div className={`${ui.card} p-6 space-y-1`}>
                <p className={ui.label}>By method</p>
                {METHODS.map((m) => (
                  <p key={m.key} className="flex justify-between text-sm text-slate-300">
                    <span>{m.label}</span>
                    <span>{money(summary.byMethod[m.key])}</span>
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <p className={ui.label}>Money in and out</p>
            <ActionForm action={moveCash} className="space-y-2">
              <div className="grid sm:grid-cols-3 gap-x-6">
                <div>
                  <label className={ui.label} htmlFor="m-type">Type</label>
                  <select id="m-type" name="type" defaultValue="OUT" className={ui.input}>
                    <option value="OUT">Taken out</option>
                    <option value="IN">Put in</option>
                  </select>
                </div>
                <div>
                  <label className={ui.label} htmlFor="m-amount">Amount</label>
                  <input id="m-amount" name="amount" required inputMode="decimal" placeholder="0,00" className={ui.input} />
                </div>
                <div>
                  <label className={ui.label} htmlFor="m-reason">What for</label>
                  <input id="m-reason" name="reason" required minLength={3} maxLength={120} placeholder="Change, supplier, ice..." className={ui.input} />
                </div>
              </div>
              <div className="pt-6"><SubmitButton variant="ghost">Add movement</SubmitButton></div>
            </ActionForm>

            {open.movements.length > 0 && (
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {open.movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-slate-200 truncate">{m.reason}</span>
                      <span className="block text-xs text-slate-500">{formatDate(m.createdAt)} · {m.user.name}</span>
                    </span>
                    <span className={m.type === "IN" ? "text-white" : "text-rose-400"}>
                      {m.type === "IN" ? "+" : "−"} {money(m.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-6">
            <p className={ui.label}>Close the register</p>
            <p className={ui.muted}>Count the cash in the drawer. We compare it with the {money(summary.expectedCashCents)} we expect.</p>
            <ActionForm action={closeRegister} confirm="Close the register? Nobody can sell until a new one is opened." className="space-y-2">
              <input type="hidden" name="id" value={open.id} />
              <div>
                <label className={ui.label} htmlFor="c-counted">Cash counted</label>
                <input id="c-counted" name="counted" required inputMode="decimal" placeholder="0,00" className={ui.input} />
              </div>
              <div>
                <label className={ui.label} htmlFor="c-note">Note (optional)</label>
                <input id="c-note" name="note" maxLength={200} className={ui.input} />
              </div>
              <div className="pt-6"><SubmitButton variant="danger" pendingText="Closing...">Close register</SubmitButton></div>
            </ActionForm>
          </section>
        </>
      ) : (
        <section className="space-y-6 max-w-xl">
          <p className={ui.label}>No register open</p>
          <p className={ui.muted}>Open one to start selling.</p>
          <ActionForm action={openRegister} className="space-y-2">
            <div>
              <label className={ui.label} htmlFor="o-opening">Cash in the drawer</label>
              <input id="o-opening" name="opening" inputMode="decimal" placeholder="0,00" className={ui.input} />
            </div>
            <div className="pt-6"><SubmitButton pendingText="Opening...">Open register</SubmitButton></div>
          </ActionForm>
        </section>
      )}

      <section className="space-y-4">
        <p className={ui.label}>Closed registers</p>
        {history.length === 0 ? (
          <p className={ui.muted}>Nothing closed yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {history.map((session) => {
              const difference = Number(session.countedCents ?? 0) - Number(session.expectedCents ?? 0);
              return (
                <li key={session.id} className="flex items-center justify-between gap-4 py-4">
                  <span className="min-w-0">
                    <span className="block text-slate-200">{session.closedAt ? formatDate(session.closedAt) : ""}</span>
                    <span className="block text-sm text-slate-500 truncate">
                      Opened {formatDate(session.openedAt)} · {session.openedBy.name}
                    </span>
                  </span>
                  <span className="text-right text-sm whitespace-nowrap">
                    <span className="block text-slate-300">Counted {money(session.countedCents ?? 0)}</span>
                    <span className={`block ${difference === 0 ? "text-slate-500" : "text-rose-400"}`}>
                      {difference === 0 ? "Matched" : `${difference > 0 ? "+" : "−"} ${money(Math.abs(difference))}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
