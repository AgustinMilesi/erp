import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { saveProduct } from "@/app/actions/pos";
import { centsToInput } from "@/lib/money";

type ProductValues = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  priceCents: bigint;
  costCents: bigint;
  taxRateBp: number;
  minStock: number;
  trackStock: boolean;
};

const TAX_OPTIONS = [
  { value: 2100, label: "21%" },
  { value: 1050, label: "10.5%" },
  { value: 2700, label: "27%" },
  { value: 0, label: "Exempt (0%)" },
];

// Used both to add a product and to edit one. Plain server markup around the action form.
export function ProductForm({
  product,
  categories,
}: {
  product?: ProductValues;
  categories: { id: string; name: string }[];
}) {
  const editing = Boolean(product);

  return (
    <ActionForm action={saveProduct} keepValues={editing} className="space-y-2">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div>
        <label className={ui.label} htmlFor="p-name">Name</label>
        <input id="p-name" name="name" required minLength={2} maxLength={120} defaultValue={product?.name} className={ui.input} />
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6">
        <div>
          <label className={ui.label} htmlFor="p-sku">SKU {editing ? "" : "(optional, we make one)"}</label>
          <input id="p-sku" name="sku" maxLength={40} defaultValue={product?.sku} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="p-barcode">Barcode (optional)</label>
          <input id="p-barcode" name="barcode" maxLength={60} defaultValue={product?.barcode ?? ""} className={ui.input} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6">
        <div>
          <label className={ui.label} htmlFor="p-price">Price (tax included)</label>
          <input id="p-price" name="price" required inputMode="decimal" placeholder="0,00" defaultValue={product ? centsToInput(product.priceCents) : ""} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="p-cost">Cost (optional)</label>
          <input id="p-cost" name="cost" inputMode="decimal" placeholder="0,00" defaultValue={product ? centsToInput(product.costCents) : ""} className={ui.input} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6">
        <div>
          <label className={ui.label} htmlFor="p-tax">Tax rate</label>
          <select id="p-tax" name="taxRateBp" defaultValue={String(product?.taxRateBp ?? 2100)} className={ui.input}>
            {TAX_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={ui.label} htmlFor="p-category">Category</label>
          <select id="p-category" name="categoryId" defaultValue={product?.categoryId ?? ""} className={ui.input}>
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6">
        {!editing && (
          <div>
            <label className={ui.label} htmlFor="p-initial">Starting stock</label>
            <input id="p-initial" name="initialStock" inputMode="numeric" placeholder="0" className={ui.input} />
          </div>
        )}
        <div>
          <label className={ui.label} htmlFor="p-min">Warn me below</label>
          <input id="p-min" name="minStock" inputMode="numeric" placeholder="0" defaultValue={product ? String(product.minStock) : ""} className={ui.input} />
        </div>
      </div>

      <label className="flex items-center gap-3 pt-4 text-slate-300 text-sm">
        <input type="checkbox" name="trackStock" defaultChecked={product?.trackStock ?? true} className="accent-rose-400 size-4" />
        Track stock for this product
      </label>

      <div className="pt-6"><SubmitButton>{editing ? "Save changes" : "Add product"}</SubmitButton></div>
    </ActionForm>
  );
}
