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
      select: { id: true, name: true, sku: true, priceCents: true, stock: true, minStock: true, trackStock: true, active: true },
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
        <div className={`${ui.card} p-8 text-center space-y-2 border-white/10`}>
          <p className="text-white font-medium">
            {q || low ? t.noProductsMatchFilter : t.noProductsYetCatalog}
          </p>
          <p className="text-xs text-slate-400">
            Podés agregar un producto manualmente o cargar un archivo JSON o Excel en el panel de abajo.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {products.map((p) => {
            const isLow = p.trackStock && p.stock <= p.minStock;
            return (
              <li key={p.id}>
                <Link href={`/app/products/${p.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-rose-400 transition">
                  <span className="min-w-0">
                    <span className={`block truncate ${p.active ? "text-white" : "text-slate-500"}`}>
                      {p.name}
                      {!p.active && <span className="ml-2 text-xs uppercase tracking-wider text-slate-500 font-mono">{t.hidden}</span>}
                    </span>
                    <span className="block text-sm text-slate-500 truncate">{p.sku}</span>
                  </span>
                  <span className="text-right whitespace-nowrap">
                    <span className="block text-white">{formatMoney(p.priceCents, organization.currency)}</span>
                    <span className={`block text-sm ${isLow ? "text-rose-400" : "text-slate-500"}`}>
                      {p.trackStock ? `${p.stock} ${t.inStock}` : t.noStockTracking}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-4 text-sm">
          {page > 1 && <Link href={href(page - 1)} className={ui.ghost}>{t.previous}</Link>}
          <span className={ui.muted}>{t.page} {page} {t.of} {pages}</span>
          {page < pages && <Link href={href(page + 1)} className={ui.ghost}>{t.next}</Link>}
        </div>
      )}

      {manage && (
        <div className="space-y-8 pt-4">
          {/* Manual Add Product Form */}
          <details className={`${ui.card} p-6`}>
            <summary className="cursor-pointer text-xs uppercase tracking-[0.15em] text-slate-300 hover:text-white transition flex items-center justify-between">
              <span>{t.addAProduct}</span>
              <span className="text-rose-400 font-mono text-xs">+ Abrir</span>
            </summary>
            <div className="pt-6"><ProductForm categories={categories} /></div>
          </details>

          <section className="space-y-4">
            <p className={ui.label}>{t.categories}</p>
            {categories.length > 0 && (
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {categories.map((category) => (
                  <li key={category.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-slate-200 truncate">
                      {category.name} <span className="text-slate-500 text-sm">· {category._count.products}</span>
                    </span>
                    <ActionForm action={deleteCategory} confirm={t.deleteCategoryConfirm}>
                      <input type="hidden" name="id" value={category.id} />
                      <SubmitButton variant="danger" pendingText="...">{t.delete}</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={saveCategory} className="flex items-end gap-4">
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
