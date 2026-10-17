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
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Cash" };

export default async function CashPage() {
  const [{ organization }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const money = (cents: number | bigint) =>
    formatMoney(cents, organization.currency, organization.showDecimals);

  const methods = [
    { key: "CASH", label: t.methodCash },
    { key: "CARD", label: t.methodCard },
    { key: "TRANSFER", label: t.methodTransfer },
    { key: "OTHER", label: t.methodOther },
  ] as const;

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

  const titleWords = t.yourCash.split(" ");
  const titleLight = titleWords[0];
  const titleBold = titleWords.slice(1).join(" ") ? `${titleWords.slice(1).join(" ")}.` : ".";

  return (
    <div className="space-y-14">
      <div>
        <PageTitle light={titleLight} bold={titleBold} />
        <p className={`${ui.muted} mt-2`}>{t.cashSubtitle}</p>
      </div>

      {open && summary ? (
        <>
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-white font-bold text-sm">{t.openRegisterSection}</p>
                </div>
                <p className="text-xs text-slate-400">
                  {t.openedByLabel} {formatDate(open.openedAt)} {t.by} {open.openedBy.name}
                </p>
              </div>

              <Link href="/pos" className={ui.button}>
                {t.goToTheTill} (POS) →
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className={`${ui.card} p-6`}>
                <p className={ui.label}>{t.salesLabel}</p>
                <p className="text-3xl font-light text-white">{money(summary.totalSalesCents)}</p>
                <p className="text-sm text-slate-500">{summary.salesCount} {t.soldCount}{summary.voidedCount > 0 ? `, ${summary.voidedCount} ${t.voidedCount}` : ""}</p>
              </div>
              <div className={`${ui.card} p-6`}>
                <p className={ui.label}>{t.cashExpected}</p>
                <p className="text-3xl font-light text-white">{money(summary.expectedCashCents)}</p>
                <p className="text-sm text-slate-500">{t.openingLabel} {money(summary.openingCents)}</p>
              </div>
              <div className={`${ui.card} p-6 space-y-1`}>
                <p className={ui.label}>{t.byMethod}</p>
                {methods.map((m) => (
                  <p key={m.key} className="flex justify-between text-sm text-slate-300">
                    <span>{m.label}</span>
                    <span>{money(summary.byMethod[m.key])}</span>
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <p className={ui.label}>{t.actions}</p>
            <ActionForm action={moveCash} className="space-y-2">
              <div className="grid sm:grid-cols-3 gap-x-6">
                <div>
                  <label className={ui.label} htmlFor="m-type">{t.actions}</label>
                  <select id="m-type" name="type" defaultValue="OUT" className={ui.input}>
                    <option value="OUT">− {t.delete}</option>
                    <option value="IN">+ {t.add}</option>
                  </select>
                </div>
                <div>
                  <label className={ui.label} htmlFor="m-amount">{t.amount}</label>
                  <input id="m-amount" name="amount" required inputMode="decimal" placeholder="0,00" className={ui.input} />
                </div>
                <div>
                  <label className={ui.label} htmlFor="m-reason">{t.notes}</label>
                  <input id="m-reason" name="reason" required minLength={3} maxLength={120} placeholder="..." className={ui.input} />
                </div>
              </div>
              <div className="pt-6"><SubmitButton variant="ghost">{t.add}</SubmitButton></div>
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
            <p className={ui.label}>{t.closeRegisterTitle}</p>
            <p className={ui.muted}>{t.countedCashLabel}. {t.cashExpected}: {money(summary.expectedCashCents)}.</p>
            <ActionForm action={closeRegister} confirm={t.closeRegisterTitle + "?"} className="space-y-2">
              <input type="hidden" name="id" value={open.id} />
              <div>
                <label className={ui.label} htmlFor="c-counted">{t.countedCashLabel}</label>
                <input id="c-counted" name="counted" required inputMode="decimal" placeholder="0,00" className={ui.input} />
              </div>
              <div>
                <label className={ui.label} htmlFor="c-note">{t.notes}</label>
                <input id="c-note" name="note" maxLength={200} placeholder={t.closeNotesPlaceholder} className={ui.input} />
              </div>
              <div className="pt-6"><SubmitButton variant="danger" pendingText="...">{t.closeRegisterBtn}</SubmitButton></div>
            </ActionForm>
          </section>
        </>
      ) : (
        <section className="space-y-6 max-w-xl">
          <p className={ui.label}>{t.openRegisterTitle}</p>
          <p className={ui.muted}>{t.openRegisterSubtitle}</p>
          <ActionForm action={openRegister} className="space-y-2">
            <div>
              <label className={ui.label} htmlFor="o-opening">{t.initialCashLabel}</label>
              <input id="o-opening" name="opening" inputMode="decimal" placeholder="0,00" className={ui.input} />
            </div>
            <div className="pt-6"><SubmitButton pendingText="...">{t.openRegisterAction}</SubmitButton></div>
          </ActionForm>
        </section>
      )}

      <section className="space-y-4">
        <p className={ui.label}>{t.shiftHistoryTitle}</p>
        {history.length === 0 ? (
          <p className={ui.muted}>{t.noShiftHistory}</p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {history.map((session) => {
              const difference = Number(session.countedCents ?? 0) - Number(session.expectedCents ?? 0);
              return (
                <li key={session.id} className="flex items-center justify-between gap-4 py-4">
                  <span className="min-w-0">
                    <span className="block text-slate-200">{session.closedAt ? `${t.closedBy} ${formatDate(session.closedAt)}` : ""}</span>
                    <span className="block text-sm text-slate-500 truncate">
                      {t.openedByLabel} {formatDate(session.openedAt)} · {session.openedBy.name}
                    </span>
                  </span>
                  <span className="text-right text-sm whitespace-nowrap">
                    <span className="block text-slate-300">{t.counted} {money(session.countedCents ?? 0)}</span>
                    <span className={`block ${difference === 0 ? "text-slate-500" : "text-rose-400"}`}>
                      {difference === 0 ? t.exactAmount : `${difference > 0 ? "+" : "−"} ${money(Math.abs(difference))}`}
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
