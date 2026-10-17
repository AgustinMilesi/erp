import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/Headline";
import { SubmitButton } from "@/components/SubmitButton";
import { ProductForm } from "@/components/pos/ProductForm";
import { ui } from "@/components/ui";
import { deleteCategory, saveCategory } from "@/app/actions/pos";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 25;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; low?: string }>;
}) {
  const [{ organization, role }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 100);
  const low = query.low === "1";
  const page = Math.max(1, Number(query.page) || 1);

  const where = {
    organizationId: organization.id,
    ...(low ? { trackStock: true, stock: { lte: db.product.fields.minStock } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { barcode: { contains: q } },
          ],
        }
      : {}),
  };

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, sku: true, priceCents: true, stock: true, minStock: true, trackStock: true, active: true, saleType: true, size: true, brand: true },
    }),
    db.product.count({ where }),
    db.category.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { products: true } } },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) =>
    `/app/products?${new URLSearchParams({ ...(q ? { q } : {}), ...(low ? { low: "1" } : {}), page: String(p) })}`;
  const manage = canManage(role);

  const titleWords = t.yourProducts.split(" ");
  const titleLight = titleWords[0];
  const titleBold = titleWords.slice(1).join(" ") ? `${titleWords.slice(1).join(" ")}.` : ".";

  return (
    <div className="space-y-10">
      <div>
        <PageTitle light={titleLight} bold={titleBold} />
        <p className={`${ui.muted} mt-2`}>{t.productsSubtitle}</p>
      </div>

      <form action="/app/products" className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-48">
          <label htmlFor="q" className={ui.label}>{t.search}</label>
          <input id="q" name="q" defaultValue={q} placeholder={t.searchProductsPlaceholder} className={ui.input} />
        </div>
        {low && <input type="hidden" name="low" value="1" />}
        <button type="submit" className={ui.ghost}>{t.search}</button>
        <Link href={low ? `/app/products${q ? `?q=${encodeURIComponent(q)}` : ""}` : `/app/products?${new URLSearchParams({ ...(q ? { q } : {}), low: "1" })}`} className={ui.ghost}>
          {low ? t.showAll : t.lowStockOnly}
        </Link>
      </form>

      {products.length === 0 ? (
        <div className="clay-card p-12 text-center space-y-3 rounded-3xl">
          <div className="size-14 rounded-3xl bg-[#EEF0FA] text-[#72729A] flex items-center justify-center mx-auto text-xl">
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-[#18182E] font-bold text-base">
            {q || low ? t.noProductsMatchFilter : t.noProductsYetCatalog}
          </p>
          <p className="text-xs text-[#72729A]">
            Podés agregar un producto manualmente o cargar un archivo JSON o Excel en el panel de abajo.
          </p>
        </div>
      ) : (
        <div className="clay-card p-6 sm:p-7 rounded-3xl space-y-4">
          <ul className="divide-y divide-[#EAE9F6]">
            {products.map((p) => {
              const isLow = p.trackStock && p.stock <= p.minStock;
              return (
                <li key={p.id}>
                  <Link href={`/app/products/${p.id}`} className="flex items-center justify-between gap-4 py-3.5 px-3 rounded-2xl hover:bg-[#F8F9FE] transition group">
                    <span className="min-w-0">
                      <span className={`flex items-center flex-wrap gap-1.5 truncate ${p.active ? "text-[#18182E] font-bold group-hover:text-[#5E48E8]" : "text-[#72729A]"}`}>
                        <span>{p.name}</span>
                        {p.saleType === "WEIGHT" && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            x Kilo
                          </span>
                        )}
                        {p.size && (
                          <span className="text-xs text-[#72729A] font-normal">
                            ({p.size})
                          </span>
                        )}
                        {!p.active && <span className="ml-1 text-[10px] uppercase font-bold tracking-wider text-[#72729A] bg-[#EEF0FA] px-2 py-0.5 rounded-full font-mono">{t.hidden}</span>}
                      </span>
                      {((p.sku && !p.sku.includes("-")) || p.brand) && (
                        <span className="block text-xs text-[#72729A] truncate mt-0.5">
                          {[!p.sku.includes("-") ? p.sku : null, p.brand].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="text-right whitespace-nowrap">
                      <span className="block text-[#18182E] font-black font-mono text-base">
                        {formatMoney(p.priceCents, organization.currency, organization.showDecimals)}
                        {p.saleType === "WEIGHT" ? <span className="text-xs text-[#72729A] font-normal"> /kg</span> : ""}
                      </span>
                      <span className={`block text-xs font-semibold ${isLow ? "text-rose-600" : "text-[#72729A]"}`}>
                        {p.trackStock ? `${p.stock} ${t.inStock}` : t.noStockTracking}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {pages > 1 && (
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#EAE9F6] text-xs">
              <span className="text-[#72729A] font-medium">{t.page} <strong className="text-[#18182E] font-mono">{page}</strong> {t.of} <strong className="text-[#18182E] font-mono">{pages}</strong></span>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link href={href(page - 1)} className="px-4 py-2 rounded-full text-xs font-bold text-[#18182E] bg-white border border-[#EAE9F6] hover:bg-[#F8F9FE] shadow-xs transition">{t.previous}</Link>
                ) : (
                  <span className="px-4 py-2 rounded-full text-xs font-bold text-[#72729A] bg-white/50 border border-[#EAE9F6] opacity-40 cursor-not-allowed select-none">{t.previous}</span>
                )}
                {page < pages ? (
                  <Link href={href(page + 1)} className="px-4 py-2 rounded-full text-xs font-bold text-[#18182E] bg-white border border-[#EAE9F6] hover:bg-[#F8F9FE] shadow-xs transition">{t.next}</Link>
                ) : (
                  <span className="px-4 py-2 rounded-full text-xs font-bold text-[#72729A] bg-white/50 border border-[#EAE9F6] opacity-40 cursor-not-allowed select-none">{t.next}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {manage && (
        <div className="space-y-8 pt-4">
          {/* Manual Add Product Form */}
          <details className="clay-card p-6 sm:p-7 rounded-3xl">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.15em] font-bold text-[#18182E] hover:text-[#5E48E8] transition flex items-center justify-between">
              <span>{t.addAProduct}</span>
              <span className="text-[#5E48E8] font-bold text-xs">+ Abrir</span>
            </summary>
            <div className="pt-6"><ProductForm categories={categories} /></div>
          </details>

          <section className="clay-card p-6 sm:p-7 rounded-3xl space-y-4">
            <p className={ui.label}>{t.categories}</p>
            {categories.length > 0 && (
              <ul className="divide-y divide-[#EAE9F6]">
                {categories.map((category) => (
                  <li key={category.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-[#18182E] font-medium truncate">
                      {category.name} <span className="text-[#72729A] text-xs">· {category._count.products} productos</span>
                    </span>
                    <ActionForm action={deleteCategory} confirm={t.deleteCategoryConfirm}>
                      <input type="hidden" name="id" value={category.id} />
                      <SubmitButton variant="danger" pendingText="...">{t.delete}</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={saveCategory} className="flex items-end gap-4 pt-2">
              <div className="flex-1">
                <label htmlFor="category-name" className={ui.label}>{t.newCategory}</label>
                <input id="category-name" name="name" required maxLength={60} placeholder={t.newCategoryPlaceholder} className={ui.input} />
              </div>
              <SubmitButton variant="ghost" pendingText="...">{t.add}</SubmitButton>
            </ActionForm>
          </section>
        </div>
      )}
    </div>
  );
}
