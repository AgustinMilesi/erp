"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/action";
import { canManage, requireSession } from "@/lib/auth/session";
import { PosError } from "@/lib/pos/errors";
import { closeSession, addCashMovement, isPrismaUnique, openSession } from "@/lib/pos/cash";
import { completeSale, voidSale } from "@/lib/pos/sales";
import { adjustStock } from "@/lib/pos/stock";
import { rateLimit } from "@/lib/rate-limit";
import {
  blankToNull,
  cashMovementSchema,
  categorySchema,
  closeSessionSchema,
  firstIssue,
  idSchema,
  lookupSchema,
  openSessionSchema,
  posSettingsSchema,
  productSchema,
  saleInputSchema,
  stockAdjustSchema,
  voidSaleSchema,
} from "@/lib/validation";

const ONLY_ADMINS = "Only owners and admins can do this.";
const NOT_FOUND = "We couldn't find that item.";
const PRODUCT_LIMIT = 20_000;

const refresh = () => {
  revalidatePath("/app", "layout");
  revalidatePath("/pos", "layout");
};

const toObject = (formData: FormData) => Object.fromEntries(formData);

// Known problems become a message for the screen. Anything unexpected is logged
// and answered with a calm generic message, so the till never shows a crash page.
async function run(work: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PosError) return fail(error.message);
    console.error(error);
    return fail("Something went wrong and nothing was saved. Please try again.");
  }
}

// Every query filters by the workspace of the session, never by anything the browser sends.

export async function saveCategory(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = categorySchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  return run(async () => {
    try {
      if (parsed.data.id) {
        const result = await db.category.updateMany({
          where: { id: parsed.data.id, organizationId: organization.id },
          data: { name: parsed.data.name },
        });
        if (result.count === 0) return fail(NOT_FOUND);
      } else {
        const count = await db.category.count({ where: { organizationId: organization.id } });
        if (count >= 200) return fail("You've reached the limit of 200 categories.");
        await db.category.create({ data: { name: parsed.data.name, organizationId: organization.id } });
      }
    } catch (error) {
      if (isPrismaUnique(error)) return fail("You already have a category with that name.");
      throw error;
    }
    refresh();
    return ok(parsed.data.id ? "Category updated." : "Category added.");
  });
}

export async function deleteCategory(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = idSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  return run(async () => {
    const result = await db.category.deleteMany({
      where: { id: parsed.data.id, organizationId: organization.id },
    });
    if (result.count === 0) return fail(NOT_FOUND);
    refresh();
    return ok("Category deleted. Its products stay without a category.");
  });
}

export async function saveProduct(formData: FormData): Promise<ActionResult> {
  const { organization, role, user } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = productSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const input = parsed.data;

  return run(async () => {
    const categoryId = blankToNull(input.categoryId);
    if (categoryId) {
      const category = await db.category.findFirst({
        where: { id: categoryId, organizationId: organization.id },
        select: { id: true },
      });
      if (!category) return fail("Pick a category from the list.");
    }

    const data = {
      name: input.name,
      barcode: blankToNull(input.barcode),
      categoryId,
      priceCents: BigInt(input.price),
      costCents: BigInt(input.cost),
      taxRateBp: input.taxRateBp,
      minStock: input.minStock,
      trackStock: input.trackStock,
    };

    try {
      if (input.id) {
        const sku = blankToNull(input.sku);
        const result = await db.product.updateMany({
          where: { id: input.id, organizationId: organization.id },
          data: { ...data, ...(sku ? { sku } : {}) },
        });
        if (result.count === 0) return fail(NOT_FOUND);
      } else {
        const count = await db.product.count({ where: { organizationId: organization.id } });
        if (count >= PRODUCT_LIMIT) return fail(`You've reached the limit of ${PRODUCT_LIMIT} products.`);

        const startingStock = input.trackStock ? input.initialStock : 0;
        await db.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              ...data,
              organizationId: organization.id,
              sku: blankToNull(input.sku) ?? `P-${randomBytes(3).toString("hex").toUpperCase()}`,
              stock: startingStock,
            },
            select: { id: true },
          });
          if (startingStock > 0) {
            await tx.stockMovement.create({
              data: {
                organizationId: organization.id,
                productId: product.id,
                userId: user.id,
                type: "INITIAL",
                quantity: startingStock,
              },
            });
          }
        });
      }
    } catch (error) {
      if (isPrismaUnique(error)) return fail("Another product already uses that SKU, barcode or external id.");
      throw error;
    }

    refresh();
    return ok(input.id ? "Product updated." : "Product added.");
  });
}

export async function toggleProduct(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = idSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  return run(async () => {
    const product = await db.product.findFirst({
      where: { id: parsed.data.id, organizationId: organization.id },
      select: { id: true, active: true },
    });
    if (!product) return fail(NOT_FOUND);
    await db.product.update({ where: { id: product.id }, data: { active: !product.active } });
    refresh();
    return ok(product.active ? "Product hidden from the till." : "Product is back in the till.");
  });
}

export async function deleteProduct(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = idSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  return run(async () => {
    const sold = await db.saleItem.count({
      where: { productId: parsed.data.id, sale: { organizationId: organization.id } },
    });
    if (sold > 0) return fail("This product has sales, so it can't be deleted. Hide it instead.");

    const result = await db.product.deleteMany({
      where: { id: parsed.data.id, organizationId: organization.id },
    });
    if (result.count === 0) return fail(NOT_FOUND);
    refresh();
    return ok("Product deleted.", { redirectTo: "/app/products" });
  });
}

export async function changeStock(formData: FormData): Promise<ActionResult> {
  const { organization, role, user } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = stockAdjustSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  return run(async () => {
    await adjustStock(
      { organizationId: organization.id, userId: user.id, role },
      { productId: parsed.data.id, kind: parsed.data.kind, quantity: parsed.data.quantity, reason: parsed.data.reason },
    );
    refresh();
    return ok("Stock updated.");
  });
}

export async function openRegister(formData: FormData): Promise<ActionResult> {
  const { organization, role, user } = await requireSession();
  const parsed = openSessionSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  return run(async () => {
    await openSession({ organizationId: organization.id, userId: user.id, role }, parsed.data.opening, parsed.data.note);
    refresh();
    return ok("Cash register open.", { redirectTo: "/app/cash" });
  });
}

export async function closeRegister(formData: FormData): Promise<ActionResult> {
  const { organization, role, user } = await requireSession();
  const parsed = closeSessionSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  return run(async () => {
    const result = await closeSession(
      { organizationId: organization.id, userId: user.id, role },
      parsed.data.id,
      parsed.data.counted,
      parsed.data.note,
    );
    refresh();
    const diff = result.differenceCents;
    return ok(diff === 0 ? "Register closed. The cash matches." : "Register closed. There is a difference, see the report.", {
      redirectTo: "/app/cash",
    });
  });
}

export async function moveCash(formData: FormData): Promise<ActionResult> {
  const { organization, role, user } = await requireSession();
  const parsed = cashMovementSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  return run(async () => {
    await addCashMovement(
      { organizationId: organization.id, userId: user.id, role },
      { type: parsed.data.type, amountCents: parsed.data.amount, reason: parsed.data.reason },
    );
    refresh();
    return ok(parsed.data.type === "IN" ? "Cash added to the drawer." : "Cash taken out of the drawer.");
  });
}

// Called by the till with a JSON body (not a form)
export async function createSale(input: unknown): Promise<ActionResult> {
  const { organization, role, user } = await requireSession();

  const limit = await rateLimit(`sale:${user.id}`, 60, 60);
  if (!limit.ok) return fail("Too many sales in a row. Wait a moment and try again.");

  const parsed = saleInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  return run(async () => {
    const sale = await completeSale({ organizationId: organization.id, userId: user.id, role }, parsed.data);
    refresh();
    return ok(sale.duplicate ? `Sale #${sale.number} was already recorded.` : `Sale #${sale.number} recorded.`, {
      data: { id: sale.id, number: String(sale.number) },
    });
  });
}

export async function voidSaleAction(formData: FormData): Promise<ActionResult> {
  const { organization, role, user } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = voidSaleSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  return run(async () => {
    const result = await voidSale({ organizationId: organization.id, userId: user.id, role }, parsed.data.id, parsed.data.reason);
    refresh();
    return ok(`Sale #${result.number} voided and its stock is back on the shelf.`);
  });
}

export async function savePosSettings(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = posSettingsSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail("Pick a currency from the list.");

  return run(async () => {
    await db.organization.update({
      where: { id: organization.id },
      data: { currency: parsed.data.currency, allowNegativeStock: parsed.data.allowNegativeStock },
    });
    refresh();
    return ok("Point of sale settings saved.");
  });
}

// ---------------------------------------------------------------------------
// Lookups used by the till while the cashier types or scans
// ---------------------------------------------------------------------------

export type TillProduct = {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  stock: number;
  trackStock: boolean;
};

const tillSelect = { id: true, name: true, sku: true, priceCents: true, stock: true, trackStock: true } as const;

const toTillProduct = (p: {
  id: string;
  name: string;
  sku: string;
  priceCents: bigint;
  stock: number;
  trackStock: boolean;
}): TillProduct => ({ ...p, priceCents: Number(p.priceCents) });

async function lookupAllowed(userId: string) {
  const limit = await rateLimit(`lookup:${userId}`, 300, 60);
  return limit.ok;
}

export async function searchProducts(q: string): Promise<TillProduct[]> {
  const { organization, user } = await requireSession();
  const parsed = lookupSchema.safeParse({ q });
  if (!parsed.success || !(await lookupAllowed(user.id))) return [];
  const term = parsed.data.q;

  const rows = await db.product.findMany({
    where: {
      organizationId: organization.id,
      active: true,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { sku: { contains: term, mode: "insensitive" } },
              { barcode: { contains: term } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 24,
    select: tillSelect,
  });
  return rows.map(toTillProduct);
}

// Exact match on barcode or sku, for scanners
export async function findProductByCode(code: string): Promise<TillProduct | null> {
  const { organization, user } = await requireSession();
  const parsed = lookupSchema.safeParse({ q: code });
  if (!parsed.success || !parsed.data.q || !(await lookupAllowed(user.id))) return null;

  const row = await db.product.findFirst({
    where: {
      organizationId: organization.id,
      active: true,
      OR: [{ barcode: parsed.data.q }, { sku: { equals: parsed.data.q, mode: "insensitive" } }],
    },
    select: tillSelect,
  });
  return row ? toTillProduct(row) : null;
}

export async function searchCustomers(q: string): Promise<{ id: string; name: string; email: string }[]> {
  const { organization, user } = await requireSession();
  const parsed = lookupSchema.safeParse({ q });
  if (!parsed.success || parsed.data.q.length < 2 || !(await lookupAllowed(user.id))) return [];

  return db.contact.findMany({
    where: {
      organizationId: organization.id,
      OR: [
        { name: { contains: parsed.data.q, mode: "insensitive" } },
        { email: { contains: parsed.data.q, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { id: true, name: true, email: true },
  });
}
