import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { saveProduct } from "@/app/actions/pos";
import { centsToInput } from "@/lib/money";
import { type TranslationDict, getDictionary } from "@/lib/i18n";

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
  t: customT,
}: {
  product?: ProductValues;
  categories: { id: string; name: string }[];
  t?: TranslationDict;
}) {
  const t = customT || getDictionary("es");
  const editing = Boolean(product);

  return (
    <ActionForm action={saveProduct} keepValues={editing} className="space-y-2">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div>
        <label className={ui.label} htmlFor="p-name">{t.productNameLabel}</label>
        <input id="p-name" name="name" required minLength={2} maxLength={120} defaultValue={product?.name} className={ui.input} />
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6">
        <div>
          <label className={ui.label} htmlFor="p-sku">{t.skuLabel} {editing ? "" : t.skuOptional}</label>
          <input id="p-sku" name="sku" maxLength={40} defaultValue={product?.sku} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="p-barcode">{t.barcodeLabel}</label>
          <input id="p-barcode" name="barcode" maxLength={60} defaultValue={product?.barcode ?? ""} className={ui.input} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6">
        <div>
          <label className={ui.label} htmlFor="p-price">{t.priceLabel}</label>
          <input id="p-price" name="price" required inputMode="decimal" placeholder="0,00" defaultValue={product ? centsToInput(product.priceCents) : ""} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="p-cost">{t.costLabel}</label>
          <input id="p-cost" name="cost" inputMode="decimal" placeholder="0,00" defaultValue={product ? centsToInput(product.costCents) : ""} className={ui.input} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6">
        <div>
          <label className={ui.label} htmlFor="p-tax">{t.taxRateLabel}</label>
          <select id="p-tax" name="taxRateBp" defaultValue={String(product?.taxRateBp ?? 2100)} className={ui.input}>
            {TAX_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={ui.label} htmlFor="p-category">{t.categoryLabel}</label>
          <select id="p-category" name="categoryId" defaultValue={product?.categoryId ?? ""} className={ui.input}>
            <option value="">{t.noCategoryOption}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6">
        {!editing && (
          <div>
            <label className={ui.label} htmlFor="p-initial">{t.startingStockLabel}</label>
            <input id="p-initial" name="initialStock" inputMode="numeric" placeholder="0" className={ui.input} />
          </div>
        )}
        <div>
          <label className={ui.label} htmlFor="p-min">{t.warnBelowLabel}</label>
          <input id="p-min" name="minStock" inputMode="numeric" placeholder="0" defaultValue={product ? String(product.minStock) : ""} className={ui.input} />
        </div>
      </div>

      <label className="flex items-center gap-3 pt-4 text-slate-300 text-sm">
        <input type="checkbox" name="trackStock" defaultChecked={product?.trackStock ?? true} className="accent-rose-400 size-4" />
        {t.trackInventoryLabel}
      </label>

      <div className="pt-6"><SubmitButton>{editing ? t.save : t.addAProduct}</SubmitButton></div>
    </ActionForm>
  );
}
