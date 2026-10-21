import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/Headline";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { deleteExpense, saveExpense } from "@/app/actions/expenses";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Gastos y Facturas" };

const EXPENSE_CATEGORIES = [
  "General",
  "Mercadería / Proveedores",
  "Servicios (Luz, Agua, Gas)",
  "Facturas / Impuestos",
  "Sueldos / Mano de obra",
  "Mantenimiento",
  "Otros",
];

const ALLOWED_LIMITS = [5, 10, 20, 100] as const;
type Limit = (typeof ALLOWED_LIMITS)[number];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; limit?: string }>;
}) {
  const [{ organization, role }] = await Promise.all([requireSession()]);
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 100);
  const categoryFilter = query.category?.trim();

  const rawLimit = Number(query.limit);
  const limit: Limit = ALLOWED_LIMITS.includes(rawLimit as Limit) ? (rawLimit as Limit) : 10;
  const rawPage = Math.max(1, Number(query.page) || 1);

  const where = {
    organizationId: organization.id,
    ...(q ? { description: { contains: q, mode: "insensitive" as const } } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
  };

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const totalCount = await db.expense.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const page = Math.min(rawPage, totalPages);
  const skip = (page - 1) * limit;

  const [expenses, monthAgg, todayAgg] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    db.expense.aggregate({
      where: { organizationId: organization.id, date: { gte: startOfMonth } },
      _sum: { amountCents: true },
    }),
    db.expense.aggregate({
      where: { organizationId: organization.id, date: { gte: startOfToday } },
      _sum: { amountCents: true },
    }),
  ]);

  const money = (cents: number | bigint) =>
    formatMoney(cents, organization.currency, organization.showDecimals);
  const manage = canManage(role);

  const monthTotal = monthAgg._sum.amountCents ?? BigInt(0);
  const todayTotal = todayAgg._sum.amountCents ?? BigInt(0);

  const href = (targetPage: number, targetLimit = limit) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryFilter) params.set("category", categoryFilter);
    if (targetLimit !== 10) params.set("limit", String(targetLimit));
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/app/expenses${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-10">
      <div>
        <PageTitle light="Gastos y" bold="Facturas." />
        <p className={`${ui.muted} mt-2`}>
          Control de pagos a proveedores, mercadería, facturas de servicios y egresos del negocio.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid sm:grid-cols-3 gap-5">
        <div className="clay-card p-6 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">Gastos de este mes</p>
          <p className="text-3xl font-extrabold text-rose-600 tracking-tight mt-1">{money(monthTotal)}</p>
          <p className="text-xs text-[#72729A] mt-1">Egresos acumulados del mes en curso</p>
        </div>
        <div className="clay-card p-6 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">Gastos de hoy</p>
          <p className="text-3xl font-extrabold text-[#18182E] tracking-tight mt-1">{money(todayTotal)}</p>
          <p className="text-xs text-[#72729A] mt-1">Registrados durante el día</p>
        </div>
        <div className="clay-card p-6 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#72729A]">Total comprobantes</p>
          <p className="text-3xl font-extrabold text-[#18182E] tracking-tight mt-1">{totalCount}</p>
          <p className="text-xs text-[#72729A] mt-1">Gastos y facturas archivadas</p>
        </div>
      </div>

      {/* Filter / Search + Selector de Cantidad */}
      <form action="/app/expenses" className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-48">
          <label htmlFor="q" className={ui.label}>Buscar concepto o proveedor</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Ej. Coca, Aguanort, Pollo, Factura..."
            className={ui.input}
          />
        </div>
        <div className="w-56">
          <label htmlFor="cat" className={ui.label}>Categoría</label>
          <select id="cat" name="category" defaultValue={categoryFilter || ""} className={ui.input}>
            <option value="">Todas las categorías</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label htmlFor="limit" className={ui.label}>Mostrar por página</label>
          <select id="limit" name="limit" defaultValue={String(limit)} className={ui.input}>
            <option value="5">5 facturas</option>
            <option value="10">10 facturas</option>
            <option value="20">20 facturas</option>
            <option value="100">100 facturas</option>
          </select>
        </div>
        <button type="submit" className={ui.ghost}>Filtrar</button>
      </form>

      {/* Quick Limit Pills Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-[#EAE9F6] pb-3">
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-[0.15em] text-[#72729A] font-bold">Ver por página:</span>
          {ALLOWED_LIMITS.map((opt) => (
            <Link
              key={opt}
              href={href(1, opt)}
              className={`px-3.5 py-1.5 rounded-full font-mono text-xs font-bold transition select-none cursor-pointer ${
                limit === opt
                  ? "bg-gradient-to-r from-[#C6F827] to-[#10B981] text-[#0A0E14] font-black shadow-xs"
                  : "bg-white text-[#72729A] hover:text-[#18182E] hover:bg-[#F8F9FE] border border-[#EAE9F6] shadow-xs"
              }`}
            >
              {opt}
            </Link>
          ))}
        </div>

        <div className="text-[#72729A] font-mono text-xs">
          Página <span className="text-[#18182E] font-bold">{page}</span> de <span className="text-[#18182E] font-bold">{totalPages}</span>
        </div>
      </div>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <div className="clay-card p-12 text-center space-y-3 rounded-3xl">
          <div className="size-14 rounded-3xl bg-[#EEF0FA] text-[#72729A] flex items-center justify-center mx-auto text-xl">
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h4m-8 4h16a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
          <p className="text-[#18182E] font-bold text-base">
            {q || categoryFilter ? "No hay gastos que coincidan con el filtro." : "Aún no tenés gastos o facturas registradas."}
          </p>
          <p className="text-xs text-[#72729A]">
            Podés registrar un comprobante con el formulario inferior o importar tus gastos desde Configuración.
          </p>
        </div>
      ) : (
        <div className="clay-card p-6 sm:p-7 rounded-3xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#EAE9F6] text-[#72729A] text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Descripción / Proveedor</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  {manage && <th className="py-3 px-4 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE9F6]">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-[#F8F9FE] transition">
                    <td className="py-3.5 px-4 text-[#72729A] text-xs whitespace-nowrap">
                      {formatDate(e.date)}
                    </td>
                    <td className="py-3.5 px-4 text-[#18182E] font-bold">
                      {e.description}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#C6F827]/10 text-[#C6F827] border border-[#C6F827]/20">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-rose-600 whitespace-nowrap font-mono text-base">
                      {money(e.amountCents)}
                    </td>
                    {manage && (
                      <td className="py-3.5 px-4 text-right">
                        <ActionForm action={deleteExpense} confirm="¿Eliminar este registro de gasto?">
                          <input type="hidden" name="id" value={e.id} />
                          <SubmitButton variant="danger" pendingText="...">Eliminar</SubmitButton>
                        </ActionForm>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#EAE9F6] text-xs">
              <div className="text-[#72729A]">
                Mostrando <span className="text-[#18182E] font-mono font-bold">{skip + 1}</span> a{" "}
                <span className="text-[#18182E] font-mono font-bold">{Math.min(skip + limit, totalCount)}</span> de{" "}
                <span className="text-[#18182E] font-mono font-bold">{totalCount}</span> facturas
              </div>

              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link href={href(page - 1)} className="px-4 py-2 rounded-full text-xs font-bold text-[#18182E] bg-white border border-[#EAE9F6] hover:bg-[#F8F9FE] shadow-xs transition">
                    ← Anterior
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-full text-xs font-bold text-[#72729A] bg-white/50 border border-[#EAE9F6] opacity-40 cursor-not-allowed select-none">
                    ← Anterior
                  </span>
                )}

                {/* Direct Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
                        acc.push("...");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      typeof item === "string" ? (
                        <span key={`dots-${idx}`} className="px-1 text-[#72729A] font-mono font-bold">
                          ...
                        </span>
                      ) : (
                        <Link
                          key={item}
                          href={href(item)}
                          className={`size-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition select-none cursor-pointer ${
                            item === page
                              ? "bg-gradient-to-r from-[#C6F827] to-[#10B981] text-[#0A0E14] font-black shadow-xs"
                              : "bg-white text-[#72729A] hover:bg-[#F8F9FE] hover:text-[#18182E] border border-[#EAE9F6]"
                          }`}
                        >
                          {item}
                        </Link>
                      ),
                    )}
                </div>

                {page < totalPages ? (
                  <Link href={href(page + 1)} className="px-4 py-2 rounded-full text-xs font-bold text-[#18182E] bg-white border border-[#EAE9F6] hover:bg-[#F8F9FE] shadow-xs transition">
                    Siguiente →
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-full text-xs font-bold text-[#72729A] bg-white/50 border border-[#EAE9F6] opacity-40 cursor-not-allowed select-none">
                    Siguiente →
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Expense Form */}
      {manage && (
        <details className="clay-card p-6 sm:p-7 rounded-3xl">
          <summary className="cursor-pointer text-xs uppercase tracking-[0.15em] font-bold text-[#18182E] hover:text-[#C6F827] transition flex items-center justify-between">
            <span>Registrar Nuevo Gasto o Factura</span>
            <span className="text-[#C6F827] font-bold text-xs">+ Abrir formulario</span>
          </summary>
          <div className="pt-6">
            <ActionForm action={saveExpense} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="exp-desc" className={ui.label}>Descripción o proveedor *</label>
                  <input
                    id="exp-desc"
                    name="description"
                    required
                    placeholder="Ej. Factura de luz Edesur, Pan Lactal, Pollo..."
                    className={ui.input}
                  />
                </div>
                <div>
                  <label htmlFor="exp-amount" className={ui.label}>Monto ($) *</label>
                  <input
                    id="exp-amount"
                    name="amount"
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    className={ui.input}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="exp-cat" className={ui.label}>Categoría</label>
                  <select id="exp-cat" name="category" defaultValue="General" className={ui.input}>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="exp-date" className={ui.label}>Fecha</label>
                  <input
                    id="exp-date"
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className={ui.input}
                  />
                </div>
              </div>

              <SubmitButton>Registrar gasto</SubmitButton>
            </ActionForm>
          </div>
        </details>
      )}
    </div>
  );
}
