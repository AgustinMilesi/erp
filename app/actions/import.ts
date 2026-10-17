"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/action";
import { canManage, requireSession } from "@/lib/auth/session";

const ONLY_ADMINS = "Only owners and admins can import data.";

export async function importDataAction(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return fail("Please select a file to import (.json, .xlsx or .xls).");
  }

  const filename = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (filename.endsWith(".json")) {
      return await importJsonData(organization.id, buffer);
    } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      return await importExcelData(organization.id, buffer);
    } else {
      return fail("Unsupported file format. Please upload a .json backup or an Excel spreadsheet (.xlsx/.xls).");
    }
  } catch (error) {
    console.error("[import error]", error);
    return fail(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function importJsonData(orgId: string, buffer: Buffer): Promise<ActionResult> {
  const text = buffer.toString("utf8");
  let data: Record<string, unknown> | unknown[];
  try {
    data = JSON.parse(text) as Record<string, unknown> | unknown[];
  } catch {
    return fail("Invalid JSON file. Could not parse content.");
  }

  let productsCount = 0;
  let debtorsCount = 0;

  const dataObj = Array.isArray(data) ? null : data;
  const rawInventory = Array.isArray(data)
    ? data
    : Array.isArray(dataObj?.loDeMari_inventory)
    ? (dataObj.loDeMari_inventory as Record<string, unknown>[])
    : Array.isArray(dataObj?.products)
    ? (dataObj.products as Record<string, unknown>[])
    : null;

  const inventoryList = rawInventory as Record<string, unknown>[] | null;

  if (inventoryList && inventoryList.length > 0) {
    // Collect and upsert categories
    const categoryMap = new Map<string, string>();
    const existingCats = await db.category.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });
    for (const c of existingCats) {
      categoryMap.set(c.name.toLowerCase().trim(), c.id);
    }

    for (const item of inventoryList) {
      const catName = String(item.category || "General").trim();
      if (catName && !categoryMap.has(catName.toLowerCase())) {
        const createdCat = await db.category.create({
          data: { organizationId: orgId, name: catName },
          select: { id: true, name: true },
        });
        categoryMap.set(catName.toLowerCase(), createdCat.id);
      }
    }

    // Process products batch
    for (const item of inventoryList) {
      const name = String(item.name || "").trim();
      if (!name) continue;

      const fullBrand = item.brand ? ` ${String(item.brand).trim()}` : "";
      const fullSize = item.size ? ` ${String(item.size).trim()}` : "";
      const fullName = `${name}${fullBrand}${fullSize}`.trim();

      const rawPrice = item.priceCents ? Number(item.priceCents) / 100 : Number(item.price || 0);
      const priceNum = isNaN(rawPrice) ? 0 : rawPrice;
      const priceCents = BigInt(Math.max(0, Math.round(priceNum * 100)));

      // Determine barcode
      let barcode: string | null = null;
      if (Array.isArray(item.barcodes) && item.barcodes.length > 0) {
        barcode = String(item.barcodes[0]).trim();
      } else if (item.barcode) {
        barcode = String(item.barcode).trim();
      }

      // SKU or fallback
      const sku = item.id ? String(item.id).slice(0, 32) : barcode || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const catName = String(item.category || "General").trim().toLowerCase();
      const categoryId = categoryMap.get(catName) || null;

      // Upsert by externalId or SKU/barcode to prevent duplicates
      const externalId = item.id ? String(item.id) : null;

      // Check existing
      const existing = await db.product.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            ...(externalId ? [{ externalId }] : []),
            ...(barcode ? [{ barcode }] : []),
            { sku },
          ],
        },
        select: { id: true },
      });

      const isWeight = item.type === "Kilo" || item.saleType === "WEIGHT" || String(item.type).toLowerCase() === "kilo";
      const saleType = isWeight ? "WEIGHT" : "UNIT";
      const brand = item.brand ? String(item.brand).trim() : null;
      const size = item.size ? String(item.size).trim() : null;

      if (existing) {
        await db.product.update({
          where: { id: existing.id },
          data: {
            name: fullName,
            priceCents,
            categoryId,
            saleType,
            brand,
            size,
            ...(barcode ? { barcode } : {}),
            active: true,
          },
        });
      } else {
        await db.product.create({
          data: {
            organizationId: orgId,
            name: fullName,
            sku,
            barcode,
            saleType,
            brand,
            size,
            priceCents,
            costCents: BigInt(0),
            taxRateBp: 2100,
            stock: Number(item.stock || 0),
            trackStock: false, // In retail marierp stock tracking is optional
            active: true,
            externalId,
            categoryId,
          },
        });
      }
      productsCount++;
    }
  }

  // 2. Process marierp debtors format as Contacts
  const rawDebtors = Array.isArray(dataObj?.loDeMari_debtors)
    ? (dataObj.loDeMari_debtors as Record<string, unknown>[])
    : Array.isArray(dataObj?.debtors)
    ? (dataObj.debtors as Record<string, unknown>[])
    : null;
  const debtorsList = rawDebtors;
  if (debtorsList && debtorsList.length > 0) {
    for (const d of debtorsList) {
      const debtorName = String(d.name || "").trim();
      if (!debtorName) continue;

      const pendingItems = Array.isArray(d.items) ? d.items.length : 0;
      const saldoFavor = d.saldoFavor ? Number(d.saldoFavor) : 0;
      const historyCount = Array.isArray(d.history) ? d.history.length : 0;
      const notes = `Importado de backup. Deuda pendiente: ${pendingItems} ítems. Saldo a favor: $${saldoFavor}. Historial: ${historyCount} pagos.`;

      const externalId = d.id ? `debtor_${String(d.id)}` : `debtor_${debtorName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const fakeEmail = `${debtorName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Date.now().toString().slice(-4)}@cliente.local`;

      const existingContact = await db.contact.findFirst({
        where: { organizationId: orgId, externalId },
        select: { id: true },
      });

      if (existingContact) {
        await db.contact.update({
          where: { id: existingContact.id },
          data: { name: debtorName, notes },
        });
      } else {
        await db.contact.create({
          data: {
            organizationId: orgId,
            name: debtorName,
            email: fakeEmail,
            notes,
            externalId,
          },
        });
      }
      debtorsCount++;
    }
  }

  revalidatePath("/app/products");
  revalidatePath("/app/contacts");
  revalidatePath("/app/pos");

  return ok(`Import completed successfully! ${productsCount} products and ${debtorsCount} customers/debtors processed.`);
}

async function importExcelData(orgId: string, buffer: Buffer): Promise<ActionResult> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return fail("Excel workbook contains no sheets.");

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) return fail("The Excel sheet is empty.");

  let imported = 0;

  // Cache existing categories
  const categoryMap = new Map<string, string>();
  const existingCats = await db.category.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
  });
  for (const c of existingCats) {
    categoryMap.set(c.name.toLowerCase().trim(), c.id);
  }

  for (const row of rows) {
    // Flexible header mapping (Spanish and English common names)
    const name = String(row.Nombre || row.nombre || row.Name || row.name || row.Producto || row.producto || "").trim();
    if (!name) continue;

    const priceRaw = row.Precio || row.precio || row.Price || row.price || row.PVP || row.pvp || 0;
    const priceNum = typeof priceRaw === "number" ? priceRaw : parseFloat(String(priceRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    const priceCents = BigInt(Math.max(0, Math.round(priceNum * 100)));

    const costRaw = row.Costo || row.costo || row.Cost || row.cost || 0;
    const costNum = typeof costRaw === "number" ? costRaw : parseFloat(String(costRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
    const costCents = BigInt(Math.max(0, Math.round(costNum * 100)));

    const barcodeRaw = row["Codigo de barra"] || row.Codigo || row.codigo || row.Barcode || row.barcode || row.Barcodes || "";
    const barcode = barcodeRaw ? String(barcodeRaw).trim() : null;

    const skuRaw = row.SKU || row.sku || row.CodigoInterno || barcode || `SKU-${Date.now()}-${imported}`;
    const sku = String(skuRaw).trim().slice(0, 40);

    const stockRaw = row.Stock || row.stock || row.Cantidad || row.cantidad || 0;
    const stock = Number.isInteger(Number(stockRaw)) ? Number(stockRaw) : 0;

    const catName = String(row.Categoria || row.categoria || row.Category || row.category || "General").trim();
    if (catName && !categoryMap.has(catName.toLowerCase())) {
      const createdCat = await db.category.create({
        data: { organizationId: orgId, name: catName },
        select: { id: true, name: true },
      });
      categoryMap.set(catName.toLowerCase(), createdCat.id);
    }
    const categoryId = catName ? categoryMap.get(catName.toLowerCase()) || null : null;

    // Check existing by barcode or sku
    const existing = await db.product.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          ...(barcode ? [{ barcode }] : []),
          { sku },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      await db.product.update({
        where: { id: existing.id },
        data: {
          name,
          priceCents,
          costCents,
          categoryId,
          ...(barcode ? { barcode } : {}),
          active: true,
        },
      });
    } else {
      await db.product.create({
        data: {
          organizationId: orgId,
          name,
          sku,
          barcode,
          priceCents,
          costCents,
          taxRateBp: 2100,
          stock,
          trackStock: stock > 0,
          active: true,
          categoryId,
        },
      });
    }
    imported++;
  }

  revalidatePath("/app/products");
  revalidatePath("/app/pos");

  return ok(`Excel import finished! ${imported} products were created or updated.`);
}
