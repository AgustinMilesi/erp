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
export const metadata: Metadata = { title: "Control de Caja" };

export default async function CashPage() {
  const { organization } = await requireSession();

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
          <div className="clay-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[#18182E] font-bold text-sm">Caja Abierta y Operativa</p>
                <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-mono font-bold border border-emerald-200">
                  Turno en curso
                </span>
              </div>
              <p className="text-xs text-[#72729A]">
                Iniciada por <strong className="text-[#18182E]">{open.openedBy.name}</strong> el {formatDate(open.openedAt)}
                {open.note ? ` · "${open.note}"` : ""}
              </p>
            </div>

            <Link
              href="/app/pos"
              className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-[var(--primary-accent-text)] bg-[var(--primary-accent)] hover:-translate-y-0.5 active:scale-95 transition shadow-[var(--primary-accent-shadow)] flex items-center gap-2 select-none"
            >
              Ir al Punto de Venta (POS) →
            </Link>
          </div>

          {/* 2. Key KPI Cards (Simplified for Small Business) */}
          <div className="grid md:grid-cols-3 gap-5">
            {/* Card 1: STAR CARD - Cash in drawer (Plata en mano) */}
            <div className="clay-card p-6 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Efectivo en el Cajón
                  </p>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Plata en mano
                  </span>
                </div>
                <p className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 tracking-tight mt-1">
                  {money(summary.expectedCashCents)}
                </p>
                <p className="text-xs text-[#72729A]">
                  Dinero que debés tener físicamente en billetes y monedas.
                </p>
              </div>

              {/* Visual Formula: Exactly explains why! */}
              <div className="mt-5 pt-3 border-t border-[#EAE9F6] space-y-1 text-xs">
                <div className="flex justify-between text-[#72729A]">
                  <span>Fondo de inicio:</span>
                  <span className="font-mono text-[#18182E] font-medium">{money(summary.openingCents)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Cobros en efectivo:</span>
                  <span className="font-mono font-bold">+{money(summary.byMethod.CASH)}</span>
                </div>
                {summary.cashInCents > 0 && (
                  <div className="flex justify-between text-sky-700">
                    <span>Entradas extras:</span>
                    <span className="font-mono font-bold">+{money(summary.cashInCents)}</span>
                  </div>
                )}
                {summary.cashOutCents > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Retiros / Gastos:</span>
                    <span className="font-mono font-bold">−{money(summary.cashOutCents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#18182E] pt-2 border-t border-[#EAE9F6]">
                  <span>Total a tener en mano:</span>
                  <span className="font-mono text-emerald-600 font-black">{money(summary.expectedCashCents)}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Total Sales */}
            <div className="clay-card p-6 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">Total Ventas del Turno</p>
                <p className="text-3xl sm:text-4xl font-extrabold font-mono text-[#18182E] tracking-tight mt-1">
                  {money(summary.totalSalesCents)}
                </p>
                <p className="text-xs text-[#72729A]">
                  {summary.salesCount} {summary.salesCount === 1 ? "ticket cobrado" : "tickets cobrados"}
                  {summary.voidedCount > 0 ? ` (${summary.voidedCount} anuladas)` : ""}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#EAE9F6] text-xs text-[#72729A] leading-relaxed">
                Monto facturado en este turno sumando todos los métodos de cobro (efectivo, transferencias y tarjetas).
              </div>
            </div>

            {/* Card 3: Payment Breakdown */}
            <div className="clay-card p-6 flex flex-col justify-between space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">¿Cómo te pagaron?</p>
                <p className="text-xs text-[#72729A] mt-1">Desglose según el medio de pago:</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F8F9FE] border border-[#EAE9F6]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#18182E] font-bold">Efectivo</span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">(al cajón)</span>
                  </div>
                  <span className="font-mono font-black text-[#18182E]">{money(summary.byMethod.CASH)}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F8F9FE] border border-[#EAE9F6]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#18182E] font-bold">Transferencia / MP</span>
                    <span className="text-[10px] text-sky-600 font-mono font-bold">(en banco)</span>
                  </div>
                  <span className="font-mono font-black text-[#18182E]">{money(summary.byMethod.TRANSFER)}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F8F9FE] border border-[#EAE9F6]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#18182E] font-bold">Tarjetas Débito / Crédito</span>
                    <span className="text-[10px] text-[var(--primary-accent)] font-mono font-bold">(en posnet)</span>
                  </div>
                  <span className="font-mono font-black text-[#18182E]">{money(summary.byMethod.CARD)}</span>
                </div>

                {summary.byMethod.OTHER > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F8F9FE] border border-[#EAE9F6]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#18182E] font-bold">Otro</span>
                    </div>
                    <span className="font-mono font-black text-[#18182E]">{money(summary.byMethod.OTHER)}</span>
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
                <div className="clay-card p-6 text-center text-xs text-[#72729A] rounded-3xl">
                  No se registraron movimientos manuales de dinero en este turno. Todo el efectivo proviene directamente de las ventas.
                </div>
              ) : (
                <div className="clay-card divide-y divide-[#EAE9F6] overflow-hidden rounded-3xl">
                  {open.movements.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#F8F9FE] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            m.type === "IN"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {m.type === "IN" ? "+" : "−"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[#18182E] text-sm font-bold truncate">{m.reason}</p>
                          <p className="text-xs text-[#72729A]">
                            {formatDate(m.createdAt)} · {m.user.name}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`font-mono font-black text-sm sm:text-base whitespace-nowrap ${
                          m.type === "IN" ? "text-emerald-600" : "text-rose-600"
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
            Historial de Turnos Anteriores ({history.length})
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
