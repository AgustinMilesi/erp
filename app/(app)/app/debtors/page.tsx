import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/Headline";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import {
  addDebtorItem,
  clearDebtorDebt,
  deleteDebtor,
  registerDebtorPayment,
  removeDebtorItem,
  saveDebtor,
} from "@/app/actions/debtors";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Deudores y Cuentas Corrientes" };

export default async function DebtorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ organization, role }] = await Promise.all([requireSession()]);
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 100);

  const where = {
    organizationId: organization.id,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const debtors = await db.debtor.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      items: { orderBy: { addedAt: "desc" } },
      payments: { orderBy: { date: "desc" } },
    },
  });

  const money = (cents: number | bigint) =>
    formatMoney(cents, organization.currency, organization.showDecimals);
  const manage = canManage(role);

  // Compute totals
  let totalOrgDebt = BigInt(0);

  const debtorCards = debtors.map((d) => {
    const totalItems = d.items.reduce((acc, it) => acc + it.totalCents, BigInt(0));
    const totalPayments = d.payments.reduce((acc, p) => acc + p.amountCents, BigInt(0));
    // In marierp, debtor.items are the active unpaid items. Debt = items - saldoFavor.
    const rawBalance = totalItems - d.saldoFavorCents;
    const balance = rawBalance > BigInt(0) ? rawBalance : BigInt(0);
    if (balance > BigInt(0)) {
      totalOrgDebt += balance;
    }

    return {
      ...d,
      totalItems,
      totalPayments,
      balance,
    };
  });

  // Separate active debtors (with debt) and zero debtors (settled / al día)
  const activeDebtors = debtorCards.filter((d) => d.balance > BigInt(0));
  const zeroDebtors = debtorCards.filter((d) => d.balance <= BigInt(0));

  return (
    <div className="space-y-10">
      <div>
        <PageTitle light="Tus" bold="Deudores." />
        <p className={`${ui.muted} mt-2`}>
          Control de fiados, cuentas corrientes, mercadería retirada y pagos de clientes.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className={`${ui.card} p-5`}>
          <p className={ui.label}>Deuda Total Pendiente</p>
          <p className="text-3xl font-light text-rose-400 tracking-tight">{money(totalOrgDebt)}</p>
          <p className="text-xs text-slate-500 mt-1">Suma acumulada de fiados</p>
        </div>
        <div className={`${ui.card} p-5`}>
          <p className={ui.label}>Fiados Activos</p>
          <p className="text-3xl font-light text-white tracking-tight">{activeDebtors.length}</p>
          <p className="text-xs text-slate-500 mt-1">Clientes con deuda pendiente</p>
        </div>
        <div className={`${ui.card} p-5`}>
          <p className={ui.label}>Clientes al Día ($0)</p>
          <p className="text-3xl font-light text-emerald-400 tracking-tight">{zeroDebtors.length}</p>
          <p className="text-xs text-slate-500 mt-1">En carpeta minimizable</p>
        </div>
      </div>

      {/* Search */}
      <form action="/app/debtors" className="flex items-end gap-4">
        <div className="flex-1">
          <label htmlFor="q" className={ui.label}>Buscar cliente</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Buscar deudor por nombre..."
            className={ui.input}
          />
        </div>
        <button type="submit" className={ui.ghost}>Buscar</button>
      </form>

      {/* Debtors List */}
      {debtorCards.length === 0 ? (
        <div className={`${ui.card} p-8 text-center space-y-2 border-white/10`}>
          <p className="text-white font-medium">
            {q ? "No hay deudores que coincidan con la búsqueda." : "Aún no tenés cuentas corrientes registradas."}
          </p>
          <p className="text-xs text-slate-400">
            Podés registrar un nuevo cliente deudor con el formulario de abajo o importar tu backup desde Configuración.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. SECCIÓN: FIADOS ACTIVOS (CON DEUDA PENDIENTE) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${activeDebtors.length > 0 ? "bg-rose-400 animate-pulse" : "bg-emerald-400"}`} />
                <h2 className="text-base font-bold text-white">
                  Fiados Activos ({activeDebtors.length})
                </h2>
              </div>
              {activeDebtors.length > 0 && (
                <span className="text-xs text-rose-300 font-mono font-semibold">
                  Deuda por cobrar: {money(totalOrgDebt)}
                </span>
              )}
            </div>

            {activeDebtors.length === 0 ? (
              <div className={`${ui.card} p-6 text-center space-y-1.5 border-white/10 bg-emerald-500/[0.02]`}>
                <p className="text-emerald-300 font-medium text-sm">
                  🎉 ¡Al día! No hay clientes con deuda pendiente.
                </p>
                <p className="text-xs text-slate-400">
                  Todas las cuentas están saldadas en $0. Cuando fíes una compra o agregues un ítem, el cliente pasará automáticamente a esta lista activa.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeDebtors.map((d) => (
                  <DebtorCard key={d.id} d={d} manage={manage} money={money} />
                ))}
              </div>
            )}
          </section>

          {/* 2. SECCIÓN: CARPETA MINIMIZABLE DE CLIENTES AL DÍA ($0) */}
          <section>
            <details
              className={`${ui.card} p-5 border-white/10 group/folder`}
              open={Boolean(q && zeroDebtors.length > 0)}
            >
              <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-4 select-none">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">📁</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">
                        Carpeta: Clientes al Día / Sin Deuda ($0)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                        {zeroDebtors.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cuentas corrientes sin saldo deudor. Al sumarles una deuda o venta fiada, pasarán automáticamente a Fiados Activos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 group-hover/folder:text-white transition">
                  <span className="group-open/folder:hidden">Abrir carpeta</span>
                  <span className="hidden group-open/folder:inline">Minimizar carpeta</span>
                  <span className="text-slate-500 group-open/folder:rotate-180 transition-transform">
                    ▼
                  </span>
                </div>
              </summary>

              <div className="pt-6 mt-4 border-t border-white/10 space-y-3">
                {zeroDebtors.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-4">
                    No hay clientes en esta carpeta.
                  </p>
                ) : (
                  zeroDebtors.map((d) => (
                    <DebtorCard key={d.id} d={d} manage={manage} money={money} />
                  ))
                )}
              </div>
            </details>
          </section>
        </div>
      )}

      {/* New Debtor Account Form */}
      {manage && (
        <details className={`${ui.card} p-6 border-white/10`}>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.15em] text-slate-300 hover:text-white transition flex items-center justify-between">
            <span>Registrar Nuevo Cliente Deudor</span>
            <span className="text-rose-400 font-mono text-xs">+ Abrir formulario</span>
          </summary>
          <div className="pt-6">
            <ActionForm action={saveDebtor} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="debtor-name" className={ui.label}>Nombre completo *</label>
                  <input
                    id="debtor-name"
                    name="name"
                    required
                    placeholder="Ej. Juan Pérez"
                    className={ui.input}
                  />
                </div>
                <div>
                  <label htmlFor="debtor-phone" className={ui.label}>Teléfono</label>
                  <input
                    id="debtor-phone"
                    name="phone"
                    placeholder="Ej. 11 1234 5678"
                    className={ui.input}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="debtor-notes" className={ui.label}>Notas o dirección</label>
                <input
                  id="debtor-notes"
                  name="notes"
                  placeholder="Detalles sobre el cliente, dirección, etc."
                  className={ui.input}
                />
              </div>
              <SubmitButton>{ui.button ? "Crear cuenta deudora" : "Guardar"}</SubmitButton>
            </ActionForm>
          </div>
        </details>
      )}
    </div>
  );
}

function DebtorCard({
  d,
  manage,
  money,
}: {
  d: {
    id: string;
    name: string;
    phone: string | null;
    notes: string | null;
    items: {
      id: string;
      productName: string;
      quantity: number;
      unitPriceCents: bigint;
      totalCents: bigint;
      addedAt: Date;
    }[];
    payments: {
      id: string;
      amountCents: bigint;
      date: Date;
      note: string | null;
    }[];
    totalItems: bigint;
    totalPayments: bigint;
    balance: bigint;
  };
  manage: boolean;
  money: (cents: number | bigint) => string;
}) {
  return (
    <details
      className={`${ui.card} p-5 border-white/10 hover:border-white/20 transition group`}
    >
      <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-base truncate">{d.name}</span>
            {d.phone && <span className="text-xs text-slate-500 font-mono">{d.phone}</span>}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {d.items.length} ítems fiados · {d.payments.length} pagos registrados
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span
              className={`block font-bold text-base ${
                d.balance > BigInt(0) ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {money(d.balance)}
            </span>
            <span className="block text-[11px] text-slate-500 uppercase tracking-wider">
              {d.balance > BigInt(0) ? "Debe pagar" : "Al día"}
            </span>
          </div>
          <span className="text-xs text-slate-500 group-open:rotate-180 transition-transform">
            ▼
          </span>
        </div>
      </summary>

      {/* Expanded details */}
      <div className="pt-6 mt-4 border-t border-white/10 space-y-6">
        {d.notes && (
          <p className="text-xs text-slate-400 bg-white/[0.02] p-3 rounded-lg border border-white/5">
            📝 {d.notes}
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Items fiados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className={ui.label}>Mercadería fiada ({d.items.length})</p>
              <span className="text-xs text-slate-400 font-medium">{money(d.totalItems)}</span>
            </div>

            {d.items.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No tiene ítems pendientes.</p>
            ) : (
              <ul className="divide-y divide-white/5 max-h-56 overflow-y-auto pr-1 text-xs">
                {d.items.map((it) => (
                  <li key={it.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-slate-200 block truncate">{it.productName}</span>
                      <span className="text-slate-500 text-[10px]">
                        {it.quantity >= 50 ? `${it.quantity}gr` : `${it.quantity}u.`} × {money(it.unitPriceCents)}{it.quantity >= 50 ? " /kg" : ""} · {formatDate(it.addedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 font-medium whitespace-nowrap">
                        {money(it.totalCents)}
                      </span>
                      {manage && (
                        <ActionForm action={removeDebtorItem} confirm="¿Eliminar este ítem fiado?">
                          <input type="hidden" name="itemId" value={it.id} />
                          <button
                            type="submit"
                            className="text-slate-500 hover:text-rose-400 p-0.5 text-xs transition leading-none"
                            title="Eliminar ítem"
                          >
                            ✕
                          </button>
                        </ActionForm>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {manage && d.items.length > 0 && (
              <div className="pt-1 flex justify-end">
                <ActionForm action={clearDebtorDebt} confirm={`¿Saldar y borrar todos los ítems de ${d.name}?`}>
                  <input type="hidden" name="debtorId" value={d.id} />
                  <button type="submit" className="text-[11px] text-rose-400/80 hover:text-rose-400 underline">
                    Saldar cuenta completa
                  </button>
                </ActionForm>
              </div>
            )}

            {/* Add Item form */}
            {manage && (
              <ActionForm action={addDebtorItem} className="pt-2 flex items-end gap-2">
                <input type="hidden" name="debtorId" value={d.id} />
                <div className="flex-1 min-w-28">
                  <input
                    name="productName"
                    required
                    placeholder="Producto..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-rose-400"
                  />
                </div>
                <div className="w-14">
                  <input
                    name="quantity"
                    type="number"
                    defaultValue="1"
                    min="1"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-rose-400 text-center"
                  />
                </div>
                <div className="w-20">
                  <input
                    name="price"
                    type="number"
                    step="any"
                    required
                    placeholder="$ Precio"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-rose-400"
                  />
                </div>
                <SubmitButton variant="ghost" pendingText="...">+ Fiar</SubmitButton>
              </ActionForm>
            )}
          </div>

          {/* Pagos realizados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className={ui.label}>Historial de Pagos ({d.payments.length})</p>
              <span className="text-xs text-emerald-400 font-medium">{money(d.totalPayments)}</span>
            </div>

            {d.payments.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No hay pagos registrados aún.</p>
            ) : (
              <ul className="divide-y divide-white/5 max-h-56 overflow-y-auto pr-1 text-xs">
                {d.payments.map((p) => (
                  <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-emerald-400 font-semibold block">{money(p.amountCents)}</span>
                      <span className="text-slate-500 text-[10px]">
                        {formatDate(p.date)} {p.note ? `· ${p.note}` : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Register payment form */}
            {manage && (
              <ActionForm action={registerDebtorPayment} className="pt-2 flex items-end gap-2">
                <input type="hidden" name="debtorId" value={d.id} />
                <div className="flex-1">
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    required
                    placeholder="$ Monto a abonar..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="flex-1">
                  <input
                    name="note"
                    placeholder="Nota opcional..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <SubmitButton variant="ghost" pendingText="...">+ Pago</SubmitButton>
              </ActionForm>
            )}
          </div>
        </div>

        {manage && (
          <div className="pt-3 border-t border-white/5 flex justify-end">
            <ActionForm action={deleteDebtor} confirm="¿Eliminar esta cuenta de cliente deudor por completo?">
              <input type="hidden" name="id" value={d.id} />
              <SubmitButton variant="danger" pendingText="...">Eliminar cuenta</SubmitButton>
            </ActionForm>
          </div>
        )}
      </div>
    </details>
  );
}
