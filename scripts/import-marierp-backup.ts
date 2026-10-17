import fs from "fs";
import crypto from "crypto";
import { db } from "../lib/db";

async function main() {
  const filePath = "d:/Proyectos/marierp/lo-de-mari-backup-2026-10-15.json";
  if (!fs.existsSync(filePath)) {
    console.error("Backup file not found at", filePath);
    process.exit(1);
  }

  console.log("Reading backup file...");
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);

  const org = await db.organization.findFirst();
  if (!org) {
    console.error("No organization found in database!");
    process.exit(1);
  }
  const user = await db.user.findFirst();
  if (!user) {
    console.error("No user found in database!");
    process.exit(1);
  }

  const orgId = org.id;
  const userId = user.id;

  console.log(`Target: Organization "${org.name}" (${orgId}), User "${user.name}" (${userId})`);

  // 1. Categories & Products
  const inventory = (data.loDeMari_inventory || []) as Array<{
    id: string;
    name: string;
    brand?: string;
    size?: string;
    price: number;
    type?: string;
    barcodes?: string[];
    category?: string;
  }>;

  console.log(`1. Processing ${inventory.length} products...`);
  const categoryMap = new Map<string, string>();
  const existingCategories = await db.category.findMany({ where: { organizationId: orgId } });
  for (const c of existingCategories) {
    categoryMap.set(c.name.toLowerCase().trim(), c.id);
  }

  for (const item of inventory) {
    const catName = String(item.category || "General").trim();
    if (catName && !categoryMap.has(catName.toLowerCase())) {
      const created = await db.category.create({
        data: { organizationId: orgId, name: catName },
      });
      categoryMap.set(catName.toLowerCase(), created.id);
    }
  }

  const existingProducts = await db.product.findMany({
    where: { organizationId: orgId },
    select: { id: true, sku: true, barcode: true, externalId: true },
  });
  const usedBarcodes = new Set<string>();
  const productByExtId = new Map<string, string>();
  for (const p of existingProducts) {
    if (p.barcode) usedBarcodes.add(p.barcode);
    if (p.externalId) productByExtId.set(p.externalId, p.id);
    productByExtId.set(p.sku, p.id);
  }

  for (const item of inventory) {
    const rawName = String(item.name || "").trim();
    if (!rawName) continue;

    const brand = item.brand ? ` ${String(item.brand).trim()}` : "";
    const size = item.size ? ` ${String(item.size).trim()}` : "";
    const fullName = `${rawName}${brand}${size}`.trim();

    const priceNum = typeof item.price === "number" ? item.price : Number(item.price || 0);
    const priceCents = BigInt(Math.max(0, Math.round(priceNum * 100)));

    let candidateBarcode: string | null = null;
    if (Array.isArray(item.barcodes) && item.barcodes.length > 0) {
      for (const b of item.barcodes) {
        const cleaned = String(b).trim();
        if (cleaned && !usedBarcodes.has(cleaned)) {
          candidateBarcode = cleaned;
          usedBarcodes.add(cleaned);
          break;
        }
      }
    }

    const sku = item.id ? String(item.id).slice(0, 40) : `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const externalId = item.id ? String(item.id) : null;
    const catName = String(item.category || "General").trim().toLowerCase();
    const categoryId = categoryMap.get(catName) || null;

    const existingId = (externalId && productByExtId.get(externalId)) || productByExtId.get(sku);

    if (existingId) {
      await db.product.update({
        where: { id: existingId },
        data: {
          name: fullName,
          priceCents,
          categoryId,
          ...(candidateBarcode ? { barcode: candidateBarcode } : {}),
          active: true,
        },
      });
    } else {
      const created = await db.product.create({
        data: {
          organizationId: orgId,
          name: fullName,
          sku,
          barcode: candidateBarcode,
          priceCents,
          costCents: BigInt(0),
          taxRateBp: 2100,
          stock: 0,
          trackStock: false,
          active: true,
          externalId,
          categoryId,
        },
      });
      if (externalId) productByExtId.set(externalId, created.id);
      productByExtId.set(sku, created.id);
    }
  }
  console.log(`Products in DB: ${await db.product.count({ where: { organizationId: orgId } })}`);

  // 2. Debtors
  const debtors = (data.loDeMari_debtors || []) as Array<{
    id: string;
    name: string;
    items?: Array<{ quantity: number; lockedPrice: number }>;
    saldoFavor?: number;
    history?: unknown[];
  }>;

  console.log(`2. Processing ${debtors.length} debtors...`);
  for (const d of debtors) {
    const name = String(d.name || "").trim();
    if (!name) continue;

    const itemsCount = (d.items || []).length;
    const totalDebt = (d.items || []).reduce(
      (acc, it) => acc + Number(it.quantity || 1) * Number(it.lockedPrice || 0),
      0
    );
    const saldoFavor = Number(d.saldoFavor || 0);
    const historyCount = (d.history || []).length;
    const notes = `Importado de backup marierp. Deuda pendiente: $${totalDebt.toLocaleString("es-AR")} (${itemsCount} ítems). Saldo a favor: $${saldoFavor.toLocaleString("es-AR")}. Historial: ${historyCount} pagos registrados.`;

    const externalId = `debtor_${String(d.id || name.toLowerCase().replace(/[^a-z0-9]/g, "_"))}`;
    const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, "") || "contacto"}_${d.id.slice(0, 6)}@cliente.local`;

    const existing = await db.contact.findFirst({
      where: { organizationId: orgId, externalId },
    });

    if (existing) {
      await db.contact.update({
        where: { id: existing.id },
        data: { name, notes },
      });
    } else {
      await db.contact.create({
        data: { organizationId: orgId, name, email, notes, externalId },
      });
    }
  }
  console.log(`Contacts in DB: ${await db.contact.count({ where: { organizationId: orgId } })}`);

  // 3. Sales History via Fast Batch createMany
  const sales = (data.loDeMari_salesHistory || []) as Array<{
    id: string;
    timestamp: string;
    items?: Array<{
      productId?: string;
      price: number;
      quantity: number;
      name: string;
      type?: string;
    }>;
    totalAmount: number;
    paymentMethods?: Record<string, number>;
    type?: string;
    notes?: string;
  }>;

  console.log(`3. Processing ${sales.length} historical sales using fast batching...`);

  let histSession = await db.cashSession.findFirst({
    where: { organizationId: orgId, note: "Histórico de ventas (marierp)" },
  });

  if (!histSession) {
    histSession = await db.cashSession.create({
      data: {
        organizationId: orgId,
        openedById: userId,
        closedById: userId,
        status: "CLOSED",
        openingCents: BigInt(0),
        countedCents: BigInt(0),
        expectedCents: BigInt(0),
        note: "Histórico de ventas (marierp)",
        openedAt: new Date(sales[0]?.timestamp || Date.now()),
        closedAt: new Date(),
      },
    });
  }

  const allContacts = await db.contact.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
  });
  const contactByName = new Map<string, string>();
  for (const c of allContacts) {
    contactByName.set(c.name.toLowerCase().trim(), c.id);
  }

  const sortedSales = sales.slice().sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const CHUNK_SIZE = 1000;
  let saleNumber = 0;

  for (let i = 0; i < sortedSales.length; i += CHUNK_SIZE) {
    const chunk = sortedSales.slice(i, i + CHUNK_SIZE);
    const saleRows: Array<any> = [];
    const itemRows: Array<any> = [];
    const paymentRows: Array<any> = [];

    for (const s of chunk) {
      saleNumber++;
      const saleId = crypto.randomUUID();
      const totalCents = BigInt(Math.max(0, Math.round(Number(s.totalAmount || 0) * 100)));
      const taxCents = BigInt(Math.round(Number(totalCents) * 0.17355));

      let contactId: string | null = null;
      if (s.notes) {
        const match = s.notes.match(/cuenta de\s+(.+)$/i);
        if (match && match[1]) {
          contactId = contactByName.get(match[1].toLowerCase().trim()) || null;
        }
      }

      let method: "CASH" | "CARD" | "TRANSFER" | "OTHER" = "CASH";
      if (s.paymentMethods) {
        if (s.paymentMethods.Posnet) method = "CARD";
        else if (s.paymentMethods.Transferencia) method = "TRANSFER";
        else if (s.paymentMethods.Deudor) method = "OTHER";
        else method = "CASH";
      }

      const saleDate = s.timestamp ? new Date(s.timestamp) : new Date();

      saleRows.push({
        id: saleId,
        organizationId: orgId,
        sessionId: histSession.id,
        cashierId: userId,
        contactId,
        number: saleNumber,
        status: "COMPLETED",
        subtotalCents: totalCents,
        discountCents: BigInt(0),
        totalCents,
        taxCents,
        changeCents: BigInt(0),
        note: s.notes || (s.type !== "Venta" ? s.type : null),
        idempotencyKey: `marierp_${s.id || saleId}`,
        createdAt: saleDate,
      });

      if (Array.isArray(s.items) && s.items.length > 0) {
        for (const it of s.items) {
          const itemPrice = BigInt(Math.max(0, Math.round(Number(it.price || 0) * 100)));
          const qty = Math.max(1, Math.round(Number(it.quantity || 1)));
          const itemTotal = itemPrice * BigInt(qty);
          const prodId = it.productId ? productByExtId.get(it.productId) || null : null;

          itemRows.push({
            id: crypto.randomUUID(),
            saleId,
            productId: prodId,
            sku: it.productId ? it.productId.slice(0, 40) : "HIST-ITEM",
            name: String(it.name || "Producto").trim(),
            quantity: qty,
            unitPriceCents: itemPrice,
            taxRateBp: 2100,
            totalCents: itemTotal,
          });
        }
      }

      paymentRows.push({
        id: crypto.randomUUID(),
        saleId,
        method,
        amountCents: totalCents,
      });
    }

    await db.sale.createMany({ data: saleRows });
    if (itemRows.length > 0) {
      await db.saleItem.createMany({ data: itemRows });
    }
    if (paymentRows.length > 0) {
      await db.payment.createMany({ data: paymentRows });
    }

    console.log(`Inserted chunk ${i + chunk.length} / ${sortedSales.length} sales`);
  }

  await db.organization.update({
    where: { id: orgId },
    data: { saleCounter: saleNumber },
  });

  console.log(`\nALL DONE!`);
  console.log(`Products: ${await db.product.count({ where: { organizationId: orgId } })}`);
  console.log(`Contacts: ${await db.contact.count({ where: { organizationId: orgId } })}`);
  console.log(`Sales: ${await db.sale.count({ where: { organizationId: orgId } })}`);
  console.log(`Sale Items: ${await db.saleItem.count()}`);
}

main()
  .catch((e) => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
