import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/Headline";
import { ui } from "@/components/ui";
import {
  CashCloseCard,
  CashMovementCard,
  CashOpenCard,
} from "@/components/cash/CashForms";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { sessionSummary } from "@/lib/pos/cash";
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Control de Caja" };

export default async function CashPage() {
  const [{ organization }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);

  const money = (cents: number | bigint) =>
    formatMoney(cents, organization.currency, organization.showDecimals);

  const [open, history] = await Promise.all([
    db.cashSession.findFirst({
      where: { organizationId: organization.id, status: "OPEN" },
      include: {
        openedBy: { select: { name: true } },
        movements: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { user: { select: { name: true } } },
        },
      },
    }),
    db.cashSession.findMany({
      where: { organizationId: organization.id, status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      take: 20,
      select: {
        id: true,
        openedAt: true,
        closedAt: true,
        openingCents: true,
        expectedCents: true,
        countedCents: true,
        note: true,
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
    }),
  ]);

  const summary = open ? await sessionSummary(db, organization.id, open.id) : null;

  return (
    <div className="space-y-10 max-w-6xl">
      {/* Page Headline */}
      <div>
        <PageTitle light="Control de" bold="Caja." />
        <p className={`${ui.muted} mt-2`}>
          Controlá la plata física en mano, registrá entradas y salidas de dinero, y cerrá tu turno al finalizar el día.
        </p>
      </div>

      {open && summary ? (
        <>
          {/* 1. Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-white font-bold text-sm">Caja Abierta y Operativa</p>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[11px] font-mono font-semibold border border-emerald-500/20">
                  Turno en curso
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Iniciada por <strong className="text-slate-200">{open.openedBy.name}</strong> el {formatDate(open.openedAt)}
                {open.note ? ` · "${open.note}"` : ""}
              </p>
            </div>

            <Link
              href="/app/pos"
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-500 text-slate-950 hover:bg-rose-400 transition shadow-lg shadow-rose-500/20 flex items-center gap-2 select-none"
            >
              <span>⚡</span> Ir al Punto de Venta (POS) →
            </Link>
          </div>

          {/* 2. Key KPI Cards (Simplified for Small Business) */}
          <div className="grid md:grid-cols-3 gap-5">
            {/* Card 1: STAR CARD - Cash in drawer (Plata en mano) */}
            <div className={`${ui.card} p-5 sm:p-6 border-emerald-400/30 bg-emerald-400/[0.02] flex flex-col justify-between`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    💵 Efectivo en el Cajón
                  </p>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                    Plata en mano
                  </span>
                </div>
                <p className="text-3xl sm:text-4xl font-bold font-mono text-emerald-400 tracking-tight">
                  {money(summary.expectedCashCents)}
                </p>
                <p className="text-xs text-slate-400">
                  Dinero que debés tener físicamente en billetes y monedas.
                </p>
              </div>

              {/* Visual Formula: Exactly explains why! */}
              <div className="mt-5 pt-3 border-t border-white/10 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>🏁 Fondo de inicio:</span>
                  <span className="font-mono text-slate-300">{money(summary.openingCents)}</span>
                </div>
                <div className="flex justify-between text-emerald-400/90">
                  <span>➕ Cobros en efectivo:</span>
                  <span className="font-mono font-medium">+{money(summary.byMethod.CASH)}</span>
                </div>
                {summary.cashInCents > 0 && (
                  <div className="flex justify-between text-sky-400">
                    <span>➕ Entradas extras:</span>
                    <span className="font-mono font-medium">+{money(summary.cashInCents)}</span>
                  </div>
                )}
                {summary.cashOutCents > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>➖ Retiros / Gastos:</span>
                    <span className="font-mono font-medium">−{money(summary.cashOutCents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white pt-1.5 border-t border-white/5">
                  <span>Total a tener en mano:</span>
                  <span className="font-mono text-emerald-400">{money(summary.expectedCashCents)}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Total Sales */}
            <div className={`${ui.card} p-5 sm:p-6 flex flex-col justify-between`}>
              <div className="space-y-1">
                <p className={ui.label}>🛍️ Total Ventas del Turno</p>
                <p className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight">
                  {money(summary.totalSalesCents)}
                </p>
                <p className="text-xs text-slate-400">
                  {summary.salesCount} {summary.salesCount === 1 ? "ticket cobrado" : "tickets cobrados"}
                  {summary.voidedCount > 0 ? ` (${summary.voidedCount} anuladas)` : ""}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 text-xs text-slate-400 leading-relaxed">
                Monto facturado en este turno sumando todos los métodos de cobro (efectivo, transferencias y tarjetas).
              </div>
            </div>

            {/* Card 3: Payment Breakdown */}
            <div className={`${ui.card} p-5 sm:p-6 flex flex-col justify-between space-y-4`}>
              <div>
                <p className={ui.label}>💳 ¿Cómo te pagaron?</p>
                <p className="text-xs text-slate-400 mt-1">Desglose según el medio de pago:</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2">
                    <span>💵</span>
                    <span className="text-slate-300 font-medium">Efectivo</span>
                    <span className="text-[10px] text-emerald-400 font-mono">(al cajón)</span>
                  </div>
                  <span className="font-mono font-bold text-white">{money(summary.byMethod.CASH)}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    <span className="text-slate-300 font-medium">Transferencia / MP</span>
                    <span className="text-[10px] text-sky-400 font-mono">(en banco)</span>
                  </div>
                  <span className="font-mono font-bold text-white">{money(summary.byMethod.TRANSFER)}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2">
                    <span>💳</span>
                    <span className="text-slate-300 font-medium">Tarjetas Débito / Crédito</span>
                    <span className="text-[10px] text-purple-400 font-mono">(en posnet)</span>
                  </div>
                  <span className="font-mono font-bold text-white">{money(summary.byMethod.CARD)}</span>
                </div>

                {summary.byMethod.OTHER > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2">
                      <span>🏷️</span>
                      <span className="text-slate-300 font-medium">Otro</span>
                    </div>
                    <span className="font-mono font-bold text-white">{money(summary.byMethod.OTHER)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Section: Movimientos de Dinero (Entradas y Salidas) */}
          <div className="space-y-4">
            <CashMovementCard />

            {/* List of movements this session */}
            <div className="space-y-2">
              <p className={ui.label}>Movimientos registrados en este turno</p>
              {open.movements.length === 0 ? (
                <div className={`${ui.card} p-5 text-center text-xs text-slate-400 border-dashed border-white/10`}>
                  No se registraron movimientos manuales de dinero en este turno. Todo el efectivo proviene directamente de las ventas.
                </div>
              ) : (
                <div className={`${ui.card} divide-y divide-white/5 overflow-hidden`}>
                  {open.movements.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            m.type === "IN"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {m.type === "IN" ? "+" : "−"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{m.reason}</p>
                          <p className="text-xs text-slate-400">
                            {formatDate(m.createdAt)} · {m.user.name}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`font-mono font-bold text-sm sm:text-base whitespace-nowrap ${
                          m.type === "IN" ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {m.type === "IN" ? "+" : "−"} {money(m.amountCents)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Section: Cerrar Caja y Arqueo */}
          <CashCloseCard
            sessionId={open.id}
            expectedCents={summary.expectedCashCents}
            currency={organization.currency}
            showDecimals={organization.showDecimals}
          />
        </>
      ) : (
        /* If Cash Register is CLOSED: Friendly Open Card */
        <CashOpenCard
          currency={organization.currency}
          showDecimals={organization.showDecimals}
        />
      )}

      {/* 5. Historial de Turnos Anteriores */}
      <section className="space-y-4 pt-6 border-t border-white/10">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>📚</span> Historial de Turnos Anteriores ({history.length})
          </h3>
          <p className="text-xs text-slate-400">
            Registro histórico de cierres de caja y resultados de arqueo.
          </p>
        </div>

        {history.length === 0 ? (
          <div className={`${ui.card} p-6 text-center text-xs text-slate-400 border-dashed border-white/10`}>
            Aún no hay turnos cerrados registrados. Al finalizar tu primer turno, el arqueo aparecerá aquí.
          </div>
        ) : (
          <div className={`${ui.card} divide-y divide-white/5 overflow-hidden`}>
            {history.map((session) => {
              const diff = Number(session.countedCents ?? 0) - Number(session.expectedCents ?? 0);
              return (
                <div
                  key={session.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">
                        {session.closedAt ? formatDate(session.closedAt) : "Turno cerrado"}
                      </span>
                      {/* Difference Result Badge */}
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full select-none ${
                          diff === 0
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            : diff > 0
                            ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                            : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                        }`}
                      >
                        {diff === 0 ? "Exacta ($0)" : diff > 0 ? `Sobrante +${money(diff)}` : `Faltante −${money(Math.abs(diff))}`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      Abierta por <strong className="text-slate-300">{session.openedBy.name}</strong> ({formatDate(session.openedAt)})
                      {session.closedBy ? (
                        <> · Cerrada por <strong className="text-slate-300">{session.closedBy.name}</strong></>
                      ) : null}
                    </p>

                    {session.note && (
                      <p className="text-xs text-slate-300 italic pt-0.5">
                        &ldquo;{session.note}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right text-xs shrink-0 space-y-0.5">
                    <div className="text-slate-400">
                      Esperado: <span className="font-mono text-slate-300">{money(session.expectedCents ?? 0)}</span>
                    </div>
                    <div className="text-slate-300 font-medium">
                      Contado: <span className="font-mono font-bold text-white">{money(session.countedCents ?? 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
