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
      <div className="grid sm:grid-cols-3 gap-5">
        <div className="clay-card p-6 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">Deuda Total Pendiente</p>
          <p className="text-3xl font-extrabold text-rose-600 tracking-tight mt-1">{money(totalOrgDebt)}</p>
          <p className="text-xs text-[#72729A] mt-1">Suma acumulada de fiados</p>
        </div>
        <div className="clay-card p-6 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">Fiados Activos</p>
          <p className="text-3xl font-extrabold text-[#18182E] tracking-tight mt-1">{activeDebtors.length}</p>
          <p className="text-xs text-[#72729A] mt-1">Clientes con deuda pendiente</p>
        </div>
        <div className="clay-card p-6 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">Clientes al Día ($0)</p>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tight mt-1">{zeroDebtors.length}</p>
          <p className="text-xs text-[#72729A] mt-1">En carpeta minimizable</p>
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
        <div className="clay-card p-12 text-center space-y-3 rounded-3xl">
          <div className="size-14 rounded-3xl bg-[#EEF0FA] text-[#72729A] flex items-center justify-center mx-auto text-xl">
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-[#18182E] font-bold text-base">
            {q ? "No hay deudores que coincidan con la búsqueda." : "Aún no tenés cuentas corrientes registradas."}
          </p>
          <p className="text-xs text-[#72729A]">
            Podés registrar un nuevo cliente deudor con el formulario de abajo o importar tu backup desde Configuración.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. SECCIÓN: FIADOS ACTIVOS (CON DEUDA PENDIENTE) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE9F6] pb-3">
              <div className="flex items-center gap-2.5">
                <span className={`size-3 rounded-full ${activeDebtors.length > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                <h2 className="text-base font-extrabold text-[#18182E]">
                  Fiados Activos ({activeDebtors.length})
                </h2>
              </div>
              {activeDebtors.length > 0 && (
                <span className="text-xs text-rose-600 font-mono font-bold">
                  Deuda por cobrar: {money(totalOrgDebt)}
                </span>
              )}
            </div>

            {activeDebtors.length === 0 ? (
              <div className="clay-card p-8 text-center space-y-2 rounded-3xl bg-emerald-50/40 border-emerald-200">
                <p className="text-emerald-800 font-bold text-sm">
                  ¡Al día! No hay clientes con deuda pendiente.
                </p>
                <p className="text-xs text-[#72729A]">
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
              className="clay-card p-6 rounded-3xl group/folder"
              open={Boolean(q && zeroDebtors.length > 0)}
            >
              <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-4 select-none">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="size-12 rounded-2xl bg-[#EEF0FA] text-[#72729A] flex items-center justify-center shadow-xs">
                    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#18182E] font-extrabold text-base">
                        Carpeta: Clientes al Día / Sin Deuda ($0)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                        {zeroDebtors.length}
                      </span>
                    </div>
                    <p className="text-xs text-[#72729A] mt-0.5">
                      Cuentas corrientes sin saldo deudor. Al sumarles una deuda o venta fiada, pasarán automáticamente a Fiados Activos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#72729A] font-bold group-hover/folder:text-[#5E48E8] transition">
                  <span className="group-open/folder:hidden">Abrir carpeta</span>
                  <span className="hidden group-open/folder:inline">Minimizar carpeta</span>
                  <span className="text-[#72729A] group-open/folder:rotate-180 transition-transform">
                    ▼
                  </span>
                </div>
              </summary>

              <div className="pt-6 mt-4 border-t border-[#EAE9F6] space-y-3">
                {zeroDebtors.length === 0 ? (
                  <p className="text-xs text-[#72729A] italic text-center py-4">
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
      className="clay-card p-6 rounded-3xl transition-all group"
    >
      <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-[#18182E] font-extrabold text-base truncate">{d.name}</span>
            {d.phone && <span className="text-xs text-[#72729A] font-mono">{d.phone}</span>}
          </div>
          <p className="text-xs text-[#72729A] mt-0.5">
            {d.items.length} ítems fiados · {d.payments.length} pagos registrados
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span
              className={`block font-black font-mono text-base ${
                d.balance > BigInt(0) ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {money(d.balance)}
            </span>
            <span className="block text-[11px] text-[#72729A] uppercase tracking-wider font-bold">
              {d.balance > BigInt(0) ? "Debe pagar" : "Al día"}
            </span>
          </div>
          <span className="text-xs text-[#72729A] group-open:rotate-180 transition-transform">
            ▼
          </span>
        </div>
      </summary>

      {/* Expanded details */}
      <div className="pt-6 mt-4 border-t border-[#EAE9F6] space-y-6">
        {d.notes && (
          <p className="text-xs text-slate-400 bg-white/[0.02] p-3 rounded-lg border border-white/5">
            {d.notes}
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
                            className="text-slate-500 hover:text-rose-400 p-0.5 transition leading-none"
                            title="Eliminar ítem"
                          >
                            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
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
