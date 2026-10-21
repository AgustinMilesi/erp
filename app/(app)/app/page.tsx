import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/Headline";
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
    <div className="space-y-8 animate-smooth-in">
      {/* 1. Header with greeting and live badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageTitle light={t.hi} bold={`${user.name.split(" ")[0]}.`} />
          <p className="text-sm text-[#72729A] mt-1 font-medium">
            {t.todayIn} <span className="font-semibold text-[#18182E]">{organization.name}</span>
          </p>
        </div>

        {/* Quick till indicator pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#EAE9F6] shadow-xs">
            <span className={`size-2.5 rounded-full ${openSession ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            <span className="text-xs font-bold text-[#18182E]">
              {openSession ? t.registerOpen : t.registerClosed}
            </span>
          </div>
          <Link
            href={openSession ? "/app/pos" : "/app/cash"}
            className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider text-[#0A0E14] bg-gradient-to-r from-[#C6F827] to-[#10B981] shadow-[0_8px_20px_rgba(198,248,39,0.32)] hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {openSession ? t.openPosTill : t.openRegisterBtn}
          </Link>
        </div>
      </div>

      {/* 2. Top Hero Section: VOUT Obsidian Card + 3 Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* VOUT Obsidian Hero Card: Today's Revenue (Span 6) */}
        <div className="lg:col-span-6 p-7 rounded-3xl relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-[#121824] via-[#0F1520] to-[#0A0E14] border border-[#1E293B] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] hover:border-[#C6F827]/40 group transition-all duration-200">
          {/* Subtle decorative lights inside card */}
          <div className="absolute -top-12 -right-12 size-40 bg-[#C6F827]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 size-48 bg-[#10B981]/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#94A3B8]">
                {t.todayRevenue}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#C6F827]/15 text-[#C6F827] border border-[#C6F827]/30">
                {organization.currency}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                {money(todayRevenue)}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white font-mono font-bold text-[11px]">
                {todaySales._count} {t.completedSales}
              </span>
              <span className="text-[#94A3B8]">en el día</span>
            </div>

            <Link
              href="/app/sales"
              className="text-xs font-bold text-[#C6F827] hover:underline flex items-center gap-1 transition"
            >
              <span>{t.viewSalesHistory}</span> →
            </Link>
          </div>
        </div>

        {/* 3 Secondary Clay Cards (Span 6) */}
        <div className="lg:col-span-6 grid sm:grid-cols-3 lg:grid-cols-1 gap-4">
          <Link
            href="/app/sales"
            className="clay-card p-5 rounded-3xl flex items-center justify-between gap-4 group hover:border-[#C6F827]/40 transition"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{t.todaySales}</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">{todaySales._count}</p>
              <p className="text-xs text-[#94A3B8]">{t.completedSales}</p>
            </div>
            <div className="size-12 rounded-2xl bg-[#0A0E14] border border-[#1E293B] text-[#C6F827] flex items-center justify-center font-bold group-hover:scale-110 group-hover:border-[#C6F827]/60 group-hover:shadow-[0_0_15px_rgba(198,248,39,0.25)] transition-all">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </Link>

          <Link
            href="/app/inbox?status=NEW"
            className="clay-card p-5 rounded-3xl flex items-center justify-between gap-4 group hover:border-[#C6F827]/40 transition"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{t.newMessages}</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">{unread}</p>
              <p className="text-xs text-[#94A3B8]">{t.customerInbox}</p>
            </div>
            <div className="size-12 rounded-2xl bg-[#0A0E14] border border-[#1E293B] text-[#C6F827] flex items-center justify-center font-bold group-hover:scale-110 group-hover:border-[#C6F827]/60 group-hover:shadow-[0_0_15px_rgba(198,248,39,0.25)] transition-all">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25z" />
              </svg>
            </div>
          </Link>

          <Link
            href="/app/contacts"
            className="clay-card p-5 rounded-3xl flex items-center justify-between gap-4 group hover:border-[#C6F827]/40 transition"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{t.totalContacts}</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">{contacts}</p>
              <p className="text-xs text-[#94A3B8]">{t.customersAndLeads}</p>
            </div>
            <div className="size-12 rounded-2xl bg-[#0A0E14] border border-[#1E293B] text-[#C6F827] flex items-center justify-center font-bold group-hover:scale-110 group-hover:border-[#C6F827]/60 group-hover:shadow-[0_0_15px_rgba(198,248,39,0.25)] transition-all">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Bottom Two Clay Cards: Latest Activity & Inventory Warnings */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Latest Sales Activity */}
        <section className="clay-card p-6 sm:p-7 rounded-3xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">{t.latestSales}</h2>
              <p className="text-xs text-[#94A3B8]">Transacciones recientes registradas</p>
            </div>
            <Link
              href="/app/sales"
              className="text-xs font-bold uppercase tracking-wider text-[#C6F827] hover:underline transition"
            >
              {t.viewAll} →
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <p className="text-xs text-[#94A3B8] italic py-8 text-center">{t.noSalesYet}</p>
          ) : (
            <ul className="divide-y divide-[#1E293B]">
              {recentSales.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/app/sales/${s.id}`}
                    className="flex items-center justify-between gap-4 py-3.5 hover:bg-[#1E293B]/40 px-3 rounded-2xl transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-2xl bg-[#0A0E14] border border-[#1E293B] text-[#C6F827] flex items-center justify-center text-sm font-bold transition">
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h4m-8 4h16a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <span className={`block truncate text-sm font-bold ${s.status === "VOIDED" ? "text-[#94A3B8] line-through" : "text-white"}`}>
                          {t.saleNumber}{s.number}
                          {s.status === "VOIDED" && (
                            <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                              {t.voidedBadge}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-[#94A3B8] truncate">
                          {formatDate(s.createdAt)} · {s.cashier.name}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-extrabold font-mono whitespace-nowrap ${s.status === "VOIDED" ? "text-[#94A3B8]" : "text-white"}`}>
                      {money(s.totalCents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Low Stock Alerts */}
        <section className="clay-card p-6 sm:p-7 rounded-3xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">{t.lowStockAlerts}</h2>
              <p className="text-xs text-[#94A3B8]">Productos por debajo del stock mínimo</p>
            </div>
            <Link
              href="/app/products"
              className="text-xs font-bold uppercase tracking-wider text-[#C6F827] hover:underline transition"
            >
              {t.allProducts} →
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-xs font-bold text-emerald-400">{t.allInventoryHealthy}</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#1E293B]">
              {lowStockProducts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/app/products/${p.id}`}
                    className="flex items-center justify-between gap-4 py-3.5 hover:bg-[#1E293B]/40 px-3 rounded-2xl transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-white text-sm font-bold truncate group-hover:text-[#C6F827] transition">
                          {p.name}
                        </span>
                        <span className="block text-xs text-[#94A3B8] font-mono truncate">{p.sku}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.stock <= 0 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                        {p.stock} {t.left}
                      </span>
                      <span className="block text-[11px] text-[#94A3B8] mt-1">{t.min} {p.minStock}</span>
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

