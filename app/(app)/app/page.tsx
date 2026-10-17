import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/Headline";
import { ui } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [{ organization, user }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const orgId = organization.id;
  const money = (cents: number | bigint) =>
    formatMoney(cents, organization.currency, organization.showDecimals);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    todaySales,
    openSession,
    lowStockProducts,
    unread,
    contacts,
    recentSales,
  ] = await Promise.all([
    // Today completed sales aggregation
    db.sale.aggregate({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: { gte: startOfToday },
      },
      _count: true,
      _sum: { totalCents: true },
    }),
    // Open cash session
    db.cashSession.findFirst({
      where: { organizationId: orgId, status: "OPEN" },
      select: { id: true, openedAt: true, openedBy: { select: { name: true } } },
    }),
    // Low stock warnings
    db.product.findMany({
      where: {
        organizationId: orgId,
        trackStock: true,
        active: true,
        stock: { lte: db.product.fields.minStock },
      },
      take: 5,
      select: { id: true, name: true, sku: true, stock: true, minStock: true },
    }),
    // Unread messages
    db.message.count({ where: { organizationId: orgId, status: "NEW" } }),
    // Total contacts
    db.contact.count({ where: { organizationId: orgId } }),
    // Recent sales
    db.sale.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        number: true,
        status: true,
        totalCents: true,
        createdAt: true,
        cashier: { select: { name: true } },
      },
    }),
  ]);

  const todayRevenue = todaySales._sum.totalCents ?? BigInt(0);

  return (
    <div className="space-y-12">
      <div className="space-y-2">
        <PageTitle light={t.hi} bold={`${user.name.split(" ")[0]}.`} />
        <p className={ui.muted}>{t.todayIn} {organization.name}.</p>
      </div>

      {/* POS & Cash Quick Banner */}
      <div className={`${ui.card} p-5 flex flex-wrap items-center justify-between gap-4 border-rose-400/30 bg-rose-400/[0.03]`}>
        <div className="flex items-center gap-3">
          <span className={`size-3 rounded-full ${openSession ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
          <div>
            <p className="text-white font-medium text-sm">
              {openSession ? t.registerOpen : t.registerClosed}
            </p>
            <p className="text-xs text-slate-400">
              {openSession
                ? `${t.openedByLabel} ${formatDate(openSession.openedAt)} ${t.by} ${openSession.openedBy.name}`
                : t.openTill}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={openSession ? "/app/pos" : "/app/cash"} className={ui.button}>
            {openSession ? t.openPosTill : t.openRegisterBtn}
          </Link>
        </div>
      </div>

      {/* Core KPI metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/app/sales" className={`${ui.card} p-6 hover:border-rose-400/60 transition`}>
          <p className={ui.label}>{t.todayRevenue}</p>
          <p className="text-3xl font-light text-white tracking-tight">{money(todayRevenue)}</p>
          <p className="text-xs text-slate-500 mt-2">{todaySales._count} {t.completedSales}</p>
        </Link>

        <Link href="/app/sales" className={`${ui.card} p-6 hover:border-rose-400/60 transition`}>
          <p className={ui.label}>{t.todaySales}</p>
          <p className="text-3xl font-light text-white">{todaySales._count}</p>
          <p className="text-xs text-slate-500 mt-2">{t.viewSalesHistory}</p>
        </Link>

        <Link href="/app/inbox?status=NEW" className={`${ui.card} p-6 hover:border-rose-400/60 transition`}>
          <p className={ui.label}>{t.newMessages}</p>
          <p className="text-3xl font-light text-white">{unread}</p>
          <p className="text-xs text-slate-500 mt-2">{t.customerInbox}</p>
        </Link>

        <Link href="/app/contacts" className={`${ui.card} p-6 hover:border-rose-400/60 transition`}>
          <p className={ui.label}>{t.totalContacts}</p>
          <p className="text-3xl font-light text-white">{contacts}</p>
          <p className="text-xs text-slate-500 mt-2">{t.customersAndLeads}</p>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Latest Sales Activity */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className={ui.label}>{t.latestSales}</p>
            <Link href="/app/sales" className="text-xs uppercase tracking-wider text-slate-400 hover:text-rose-400 transition">
              {t.viewAll}
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <p className={ui.muted}>{t.noSalesYet}</p>
          ) : (
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {recentSales.map((s) => (
                <li key={s.id}>
                  <Link href={`/app/sales/${s.id}`} className="flex items-center justify-between gap-4 py-3.5 hover:text-rose-400 transition">
                    <span className="min-w-0">
                      <span className={`block truncate text-sm ${s.status === "VOIDED" ? "text-slate-500 line-through" : "text-white"}`}>
                        {t.saleNumber}{s.number}
                        {s.status === "VOIDED" && <span className="ml-2 text-xs uppercase tracking-wider text-rose-400 no-underline font-mono">{t.voidedBadge}</span>}
                      </span>
                      <span className="block text-xs text-slate-500 truncate">
                        {formatDate(s.createdAt)} · {s.cashier.name}
                      </span>
                    </span>
                    <span className={`text-sm font-medium whitespace-nowrap ${s.status === "VOIDED" ? "text-slate-500" : "text-white"}`}>
                      {money(s.totalCents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Low Stock Alerts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className={ui.label}>{t.lowStockAlerts}</p>
            <Link href="/app/products" className="text-xs uppercase tracking-wider text-slate-400 hover:text-rose-400 transition">
              {t.allProducts}
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className={ui.muted}>{t.allInventoryHealthy}</p>
          ) : (
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {lowStockProducts.map((p) => (
                <li key={p.id}>
                  <Link href={`/app/products/${p.id}`} className="flex items-center justify-between gap-4 py-3.5 hover:text-rose-400 transition">
                    <div className="min-w-0">
                      <span className="block text-white text-sm truncate">{p.name}</span>
                      <span className="block text-xs text-slate-500 font-mono truncate">{p.sku}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${p.stock <= 0 ? "text-rose-400" : "text-amber-400"}`}>
                        {p.stock} {t.left}
                      </span>
                      <span className="block text-xs text-slate-500">{t.min} {p.minStock}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

