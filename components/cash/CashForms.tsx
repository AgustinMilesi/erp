"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { closeRegister, moveCash, openRegister } from "@/app/actions/pos";
import { formatMoney, parseMoney } from "@/lib/money";

/* -------------------------------------------------------------------------
 * 1. Formulario de Apertura de Caja (Inicio de Turno)
 * ------------------------------------------------------------------------- */
export function CashOpenCard({
  currency = "ARS",
  showDecimals = false,
}: {
  currency?: string;
  showDecimals?: boolean;
}) {
  const [amountStr, setAmountStr] = useState("");

  const quickPresets = [
    { label: "$0 (Sin cambio)", value: "0" },
    { label: "$5.000", value: "5000" },
    { label: "$10.000", value: "10000" },
    { label: "$20.000", value: "20000" },
    { label: "$50.000", value: "50000" },
  ];

  return (
    <div className={`${ui.card} p-6 sm:p-8 border-rose-400/30 bg-rose-400/[0.02] space-y-6 max-w-2xl`}>
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
          <span className="size-2 rounded-full bg-rose-400" />
          Caja actualmente cerrada
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Comenzar Nuevo Turno de Caja
        </h2>
        <p className="text-sm text-slate-300">
          Para habilitar las ventas en el Punto de Venta (POS), ingresá con cuánto dinero en efectivo
          arrancás (tu fondo de cambio o caja chica). Si no tenés plata previa, podés iniciar con $0.
        </p>
      </div>

      <ActionForm action={openRegister} className="space-y-5">
        <div className="space-y-3">
          <label htmlFor="opening" className={ui.label}>
            Fondo de cambio inicial en efectivo
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-base font-bold">
              $
            </span>
            <input
              id="opening"
              name="opening"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0,00"
              className={`${ui.input} pl-9 text-lg font-mono font-bold text-white`}
              autoFocus
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400">Montos rápidos:</span>
            {quickPresets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setAmountStr(preset.value)}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="note" className={ui.label}>
            Nota de turno o responsable (Opcional)
          </label>
          <input
            id="note"
            name="note"
            maxLength={200}
            placeholder="Ej: Turno mañana, cajero Juan, cambio en billetes de $500..."
            className={ui.input}
          />
        </div>

        <div className="pt-2">
          <SubmitButton pendingText="Abriendo caja..." className="w-full sm:w-auto">
            🟢 Abrir Caja y Comenzar Turno
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * 2. Formulario de Movimientos de Dinero (Entradas y Salidas)
 * ------------------------------------------------------------------------- */
export function CashMovementCard() {
  const [type, setType] = useState<"OUT" | "IN">("OUT");
  const [reason, setReason] = useState("");

  const outChips = [
    "Pago a proveedor de pan",
    "Pago de bebidas / lácteos",
    "Retiro de ganancia (dueño)",
    "Artículos de limpieza / librería",
    "Flete o delivery",
  ];

  const inChips = [
    "Cambio chico traído al local",
    "Fondo extra de caja",
    "Cobro pendiente de fiado",
    "Aporte de socio / dueño",
  ];

  return (
    <div className={`${ui.card} p-5 sm:p-6 space-y-5 border-white/10`}>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>💸</span> Registrar Entrada o Salida de Dinero
        </h3>
        <p className="text-xs text-slate-400">
          Anotá cualquier plata física que entre o salga del cajón durante el turno para que el arqueo final sea exacto.
        </p>
      </div>

      <ActionForm
        action={moveCash}
        className="space-y-4"
        keepValues={false}
      >
        {/* Toggle IN / OUT */}
        <div className="space-y-1.5">
          <label className={ui.label}>Tipo de movimiento</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType("OUT");
                setReason("");
              }}
              className={`p-3 rounded-xl flex items-center justify-center gap-2 font-medium text-xs sm:text-sm transition select-none border ${
                type === "OUT"
                  ? "bg-rose-500/20 text-rose-300 border-rose-400/50 shadow-sm"
                  : "bg-white/[0.03] text-slate-400 border-white/5 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="text-base">🔴</span>
              <span className="font-bold">Sacar plata (Salida / Gasto)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType("IN");
                setReason("");
              }}
              className={`p-3 rounded-xl flex items-center justify-center gap-2 font-medium text-xs sm:text-sm transition select-none border ${
                type === "IN"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-sm"
                  : "bg-white/[0.03] text-slate-400 border-white/5 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="text-base">🟢</span>
              <span className="font-bold">Meter plata (Entrada / Ingreso)</span>
            </button>
          </div>

          <input type="hidden" name="type" value={type} />
        </div>

        {/* Dynamic Context Helper */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300">
          {type === "OUT" ? (
            <p>
              💡 <span className="font-semibold text-rose-300">Salida de dinero:</span> Usalo cuando saques billetes del cajón para pagar a proveedores, gastos diarios, fletes o retiros personales.
            </p>
          ) : (
            <p>
              💡 <span className="font-semibold text-emerald-300">Entrada de dinero:</span> Usalo si trajiste billetes de cambio para tener en la caja o agregaste dinero de tu bolsillo.
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="amount" className={ui.label}>
              Monto a {type === "OUT" ? "retirar" : "ingresar"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">
                $
              </span>
              <input
                id="amount"
                name="amount"
                required
                inputMode="decimal"
                placeholder="0,00"
                className={`${ui.input} pl-8 font-mono font-bold text-white`}
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="reason" className={ui.label}>
              Motivo o concepto
            </label>
            <input
              id="reason"
              name="reason"
              required
              minLength={3}
              maxLength={120}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === "OUT"
                  ? "Ej: Pago a repartidor de pan, compra de bolsas..."
                  : "Ej: Traje cambio de $1.000, aporte personal..."
              }
              className={ui.input}
            />
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-slate-500">Sugerencias rápidas:</span>
          {(type === "OUT" ? outChips : inChips).map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setReason(chip)}
              className="px-2 py-0.5 rounded-md text-[11px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition"
            >
              + {chip}
            </button>
          ))}
        </div>

        <div className="pt-2">
          <SubmitButton
            variant={type === "OUT" ? "danger" : "ghost"}
            pendingText="Guardando..."
            className="w-full sm:w-auto"
          >
            {type === "OUT" ? "− Registrar Salida de Dinero" : "+ Registrar Entrada de Dinero"}
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * 3. Formulario de Cierre y Arqueo de Caja (Fin del Turno)
 * ------------------------------------------------------------------------- */
export function CashCloseCard({
  sessionId,
  expectedCents,
  currency = "ARS",
  showDecimals = false,
}: {
  sessionId: string;
  expectedCents: number;
  currency?: string;
  showDecimals?: boolean;
}) {
  const [countedStr, setCountedStr] = useState("");
  const money = (cents: number) => formatMoney(cents, currency, showDecimals);

  const countedCents = parseMoney(countedStr);
  const hasCounted = countedCents !== null;
  const differenceCents = hasCounted ? countedCents - expectedCents : 0;

  return (
    <div className={`${ui.card} p-5 sm:p-7 space-y-6 border-white/10 bg-white/[0.01]`}>
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-slate-300 border border-white/10">
          <span>🏁</span> Fin de turno / Arqueo final
        </div>
        <h3 className="text-lg font-bold text-white">
          Cerrar Caja y Control de Efectivo
        </h3>
        <p className="text-xs text-slate-300">
          Al terminar el día o cambiar de cajero, contá los billetes y monedas que tenés en el cajón y cargalo aquí para comprobar que todo coincida.
        </p>
      </div>

      {/* Target expected cash display */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs text-slate-400 block">Efectivo esperado según el sistema:</span>
          <span className="text-2xl font-mono font-bold text-white tracking-tight">
            {money(expectedCents)}
          </span>
        </div>
        <div className="text-xs text-slate-400 max-w-xs">
          (Fondo inicial + Ventas cobradas en efectivo + Entradas − Salidas)
        </div>
      </div>

      <ActionForm
        action={closeRegister}
        confirm="¿Confirmar el cierre de caja? El turno se cerrará y se guardará el resultado del arqueo."
        className="space-y-5"
      >
        <input type="hidden" name="id" value={sessionId} />

        <div className="space-y-2">
          <label htmlFor="counted" className={ui.label}>
            ¿Cuánto dinero en efectivo contaste físicamente?
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-lg font-bold">
              $
            </span>
            <input
              id="counted"
              name="counted"
              required
              inputMode="decimal"
              value={countedStr}
              onChange={(e) => setCountedStr(e.target.value)}
              placeholder="0,00"
              className={`${ui.input} pl-9 text-xl font-mono font-bold text-white`}
            />
          </div>
        </div>

        {/* Interactive Live Audit Feedback */}
        {hasCounted && (
          <div
            className={`p-4 rounded-xl border text-sm transition-all animate-in fade-in duration-200 ${
              differenceCents === 0
                ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-200"
                : differenceCents > 0
                ? "bg-sky-500/10 border-sky-400/40 text-sky-200"
                : "bg-rose-500/10 border-rose-400/40 text-rose-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">
                {differenceCents === 0 ? "✅" : differenceCents > 0 ? "✨" : "⚠️"}
              </span>
              <div className="space-y-1">
                <p className="font-bold text-sm">
                  {differenceCents === 0 && "¡Caja clavada! El dinero coincide perfectamente ($0 diferencia)."}
                  {differenceCents > 0 && `Sobrante de efectivo: +${money(differenceCents)}`}
                  {differenceCents < 0 && `Faltante de efectivo: −${money(Math.abs(differenceCents))}`}
                </p>
                <p className="text-xs opacity-90">
                  {differenceCents === 0 &&
                    "Todo el dinero físico coincide exactamente con lo registrado en el sistema. Podés cerrar el turno con tranquilidad."}
                  {differenceCents > 0 &&
                    "Hay más plata en el cajón de la que figura en las ventas. Verificá si se cobró algún artículo sin registrar en el POS."}
                  {differenceCents < 0 &&
                    "Falta dinero en el cajón físico respecto al sistema. Verificá si diste algún vuelto de más o si hubo algún gasto que no quedó registrado."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="c-note" className={ui.label}>
            Observaciones o comentarios del cierre (Opcional)
          </label>
          <input
            id="c-note"
            name="note"
            maxLength={200}
            placeholder="Ej: Se entregó el sobre con la recaudación al dueño, todo en orden..."
            className={ui.input}
          />
        </div>

        <div className="pt-2">
          <SubmitButton
            variant="danger"
            pendingText="Cerrando caja..."
            className="w-full sm:w-auto"
          >
            🔒 Confirmar Cierre de Caja y Finalizar Turno
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
