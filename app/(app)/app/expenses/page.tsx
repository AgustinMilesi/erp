import type { Metadata } from "next";
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

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const [{ organization, role }] = await Promise.all([requireSession()]);
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 100);
  const categoryFilter = query.category?.trim();

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

  const [expenses, totalCount, monthAgg, todayAgg] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take: 100,
    }),
    db.expense.count({ where }),
    db.expense.aggregate({
      where: { organizationId: organization.id, date: { gte: startOfMonth } },
      _sum: { amountCents: true },
    }),
    db.expense.aggregate({
      where: { organizationId: organization.id, date: { gte: startOfToday } },
      _sum: { amountCents: true },
    }),
  ]);

  const money = (cents: number | bigint) => formatMoney(cents, organization.currency);
  const manage = canManage(role);

  const monthTotal = monthAgg._sum.amountCents ?? BigInt(0);
  const todayTotal = todayAgg._sum.amountCents ?? BigInt(0);

  return (
    <div className="space-y-10">
      <div>
        <PageTitle light="Gastos y" bold="Facturas." />
        <p className={`${ui.muted} mt-2`}>
          Control de pagos a proveedores, mercadería, facturas de servicios y egresos del negocio.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className={`${ui.card} p-5`}>
          <p className={ui.label}>Gastos de este mes</p>
          <p className="text-3xl font-light text-rose-400 tracking-tight">{money(monthTotal)}</p>
          <p className="text-xs text-slate-500 mt-1">Egresos acumulados del mes en curso</p>
        </div>
        <div className={`${ui.card} p-5`}>
          <p className={ui.label}>Gastos de hoy</p>
          <p className="text-3xl font-light text-white tracking-tight">{money(todayTotal)}</p>
          <p className="text-xs text-slate-500 mt-1">Registrados durante el día</p>
        </div>
        <div className={`${ui.card} p-5`}>
          <p className={ui.label}>Total comprobantes</p>
          <p className="text-3xl font-light text-white tracking-tight">{totalCount}</p>
          <p className="text-xs text-slate-500 mt-1">Gastos y facturas archivadas</p>
        </div>
      </div>

      {/* Filter / Search */}
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
        <button type="submit" className={ui.ghost}>Filtrar</button>
      </form>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <div className={`${ui.card} p-8 text-center space-y-2 border-white/10`}>
          <p className="text-white font-medium">
            {q || categoryFilter ? "No hay gastos que coincidan con el filtro." : "Aún no tenés gastos o facturas registradas."}
          </p>
          <p className="text-xs text-slate-400">
            Podés registrar un comprobante con el formulario inferior o importar tus gastos desde Configuración.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Descripción / Proveedor</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Monto</th>
                {manage && <th className="py-3 px-4 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(e.date)}
                  </td>
                  <td className="py-3.5 px-4 text-white font-medium">
                    {e.description}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-rose-400 whitespace-nowrap">
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
      )}

      {/* Record Expense Form */}
      {manage && (
        <details className={`${ui.card} p-6 border-white/10`}>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.15em] text-slate-300 hover:text-white transition flex items-center justify-between">
            <span>Registrar Nuevo Gasto o Factura</span>
            <span className="text-rose-400 font-mono text-xs">+ Abrir formulario</span>
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
