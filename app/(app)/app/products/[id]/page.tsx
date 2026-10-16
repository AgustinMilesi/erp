import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { ProductForm } from "@/components/pos/ProductForm";
import { ui } from "@/components/ui";
import { changeStock, deleteProduct, toggleProduct } from "@/app/actions/pos";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Product" };

const MOVEMENT_LABEL = {
  INITIAL: "Starting stock",
  RESTOCK: "Restock",
  SALE: "Sale",
  VOID: "Sale voided",
  ADJUSTMENT: "Correction",
} as const;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { organization, role } = await requireSession();
  const { id } = await params;
  const manage = canManage(role);

  const [product, categories] = await Promise.all([
    db.product.findFirst({
      where: { id, organizationId: organization.id },
      include: {
        movements: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { user: { select: { name: true } } },
        },
      },
    }),
    db.category.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-12">
      <Link href="/app/products" className={`${ui.muted} text-sm hover:text-rose-400 transition`}>
        ← Back to products
      </Link>

      <div className="space-y-2">
        <h1 className="text-4xl font-black text-white leading-tight break-words">{product.name}</h1>
        <p className={ui.muted}>
          {formatMoney(product.priceCents, organization.currency)}
          {product.trackStock ? ` · ${product.stock} in stock` : " · no stock tracking"}
          {!product.active && " · hidden from the till"}
        </p>
      </div>

      {manage ? (
        <ProductForm product={product} categories={categories} />
      ) : (
        <p className={ui.muted}>Only owners and admins can edit products.</p>
      )}

      {product.trackStock && (
        <section className="space-y-6">
          <p className={ui.label}>Stock</p>

          {manage && (
            <ActionForm action={changeStock} className="space-y-2">
              <input type="hidden" name="id" value={product.id} />
              <div className="grid sm:grid-cols-3 gap-x-6">
                <div>
                  <label className={ui.label} htmlFor="s-kind">What happened</label>
                  <select id="s-kind" name="kind" defaultValue="RESTOCK" className={ui.input}>
                    <option value="RESTOCK">Units arrived</option>
                    <option value="ADJUSTMENT">Correction (use a minus to remove)</option>
                  </select>
                </div>
                <div>
                  <label className={ui.label} htmlFor="s-qty">Units</label>
                  <input id="s-qty" name="quantity" required inputMode="numeric" placeholder="10" className={ui.input} />
                </div>
                <div>
                  <label className={ui.label} htmlFor="s-reason">Reason</label>
                  <input id="s-reason" name="reason" maxLength={200} placeholder="Supplier, broken, count..." className={ui.input} />
                </div>
              </div>
              <div className="pt-6"><SubmitButton variant="ghost">Update stock</SubmitButton></div>
            </ActionForm>
          )}

          {product.movements.length === 0 ? (
            <p className={ui.muted}>No movements yet.</p>
          ) : (
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {product.movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-slate-200">{MOVEMENT_LABEL[m.type]}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {formatDate(m.createdAt)}
                      {m.user ? ` · ${m.user.name}` : ""}
                      {m.reason ? ` · ${m.reason}` : ""}
                    </span>
                  </span>
                  <span className={m.quantity > 0 ? "text-white" : "text-rose-400"}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {manage && (
        <div className="flex flex-wrap gap-3">
          <ActionForm action={toggleProduct} keepValues>
            <input type="hidden" name="id" value={product.id} />
            <SubmitButton variant="ghost" pendingText="...">{product.active ? "Hide from the till" : "Show in the till"}</SubmitButton>
          </ActionForm>
          <ActionForm action={deleteProduct} confirm="Delete this product? This can't be undone.">
            <input type="hidden" name="id" value={product.id} />
            <SubmitButton variant="danger" pendingText="Deleting...">Delete product</SubmitButton>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
