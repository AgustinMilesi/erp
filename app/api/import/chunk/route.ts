import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

interface RawImportItem {
  id?: string;
  name?: string;
  productId?: string;
  quantity?: number | string;
  lockedPrice?: number | string;
  price?: number | string;
  amount?: number | string;
  type?: string;
  addedAt?: string | number | Date;
  date?: string | number | Date;
  description?: string;
  notes?: string;
  timestamp?: string | number | Date;
  totalAmount?: number | string;
  paymentMethods?: { Posnet?: boolean; Transferencia?: boolean; Deudor?: boolean };
  items?: RawImportItem[];
  savedDebts?: { items?: RawImportItem[] }[];
  history?: RawImportItem[];
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.organization.id;
    const userId = session.user.id;

    const body = await req.json();
    const { kind, items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    if (kind === "categories") {
      const existing = await db.category.findMany({
        where: { organizationId: orgId },
        select: { name: true },
      });
      const names = new Set(existing.map((c) => c.name.toLowerCase().trim()));

      for (const catName of items) {
        const cleaned = String(catName || "").trim();
        if (cleaned && !names.has(cleaned.toLowerCase())) {
          await db.category.create({
            data: { organizationId: orgId, name: cleaned },
          });
          names.add(cleaned.toLowerCase());
        }
      }
      return NextResponse.json({ ok: true, count: items.length });
    }

    if (kind === "products") {
      const categories = await db.category.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      });
      const catMap = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c.id]));

      const existingProducts = await db.product.findMany({
        where: { organizationId: orgId },
        select: { id: true, sku: true, barcode: true, externalId: true },
      });
      const usedBarcodes = new Set(existingProducts.map((p) => p.barcode).filter(Boolean));
      const byExtId = new Map(
        existingProducts.filter((p) => p.externalId).map((p) => [p.externalId!, p.id])
      );
      const bySku = new Map(existingProducts.map((p) => [p.sku, p.id]));

      for (const item of items) {
        const rawName = String(item.name || "").trim();
        if (!rawName) continue;

        const brand = item.brand ? ` ${String(item.brand).trim()}` : "";
        const size = item.size ? ` ${String(item.size).trim()}` : "";
        const fullName = `${rawName}${brand}${size}`.trim();

        const rawPrice = item.priceCents ? Number(item.priceCents) / 100 : Number(item.price || 0);
        const priceNum = isNaN(rawPrice) ? 0 : rawPrice;
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
        } else if (item.barcode) {
          const cleaned = String(item.barcode).trim();
          if (cleaned && !usedBarcodes.has(cleaned)) {
            candidateBarcode = cleaned;
            usedBarcodes.add(cleaned);
          }
        }

        const externalId = item.id ? String(item.id) : null;
        const sku = externalId ? externalId.slice(0, 40) : candidateBarcode || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const catName = String(item.category || "General").trim().toLowerCase();
        const categoryId = catMap.get(catName) || null;

        const existingId = (externalId && byExtId.get(externalId)) || bySku.get(sku);

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
              stock: Number(item.stock || 0),
              trackStock: false,
              active: true,
              externalId,
              categoryId,
            },
          });
          if (externalId) byExtId.set(externalId, created.id);
          bySku.set(sku, created.id);
        }
      }
      return NextResponse.json({ ok: true, count: items.length });
    }

    if (kind === "debtors") {
      // 1. Fetch products to resolve names, units, and weights
      const existingProducts = await db.product.findMany({
        where: { organizationId: orgId },
        select: { id: true, externalId: true, name: true, priceCents: true },
      });
      const prodByExtId = new Map(existingProducts.filter((p) => p.externalId).map((p) => [p.externalId!, p]));

      for (const d of items) {
        const name = String(d.name || "").trim();
        if (!name) continue;

        const saldoFavorCents = BigInt(Math.max(0, Math.round(Number(d.saldoFavor || 0) * 100)));
        const externalId = `debtor_${d.id}`;

        const existing = await db.debtor.findFirst({
          where: { organizationId: orgId, externalId },
        });

        let debtorId = existing?.id;
        if (existing) {
          await db.debtor.update({
            where: { id: existing.id },
            data: { name, saldoFavorCents },
          });
          // Delete old items and payments if re-importing this debtor to avoid duplicates
          await db.debtorItem.deleteMany({ where: { debtorId: existing.id } });
          await db.debtorPayment.deleteMany({ where: { debtorId: existing.id } });
        } else {
          const created = await db.debtor.create({
            data: {
              organizationId: orgId,
              name,
              saldoFavorCents,
              externalId,
              notes: `Cuenta corriente marierp. ${d.items?.length || 0} ítems fiados.`,
            },
          });
          debtorId = created.id;
        }

        // Collect items from both d.items and d.savedDebts
        const allPendingItems: RawImportItem[] = [];
        if (Array.isArray(d.items)) {
          allPendingItems.push(...d.items);
        }
        if (Array.isArray(d.savedDebts)) {
          for (const sd of d.savedDebts) {
            if (Array.isArray(sd.items)) {
              allPendingItems.push(...sd.items);
            }
          }
        }

        if (debtorId && allPendingItems.length > 0) {
          const itemRows = allPendingItems.map((it: RawImportItem) => {
            const rawQty = Number(it.quantity || 1);
            let pName = String(it.name || "").trim();
            const matchedProd = it.productId ? prodByExtId.get(it.productId) : null;
            if (matchedProd && !pName) {
              pName = matchedProd.name;
            }

            const isCumulative =
              it.productId === "summary-item" ||
              it.productId === "cumulative-debt-id" ||
              it.productId === "CUMULATIVE_DEBT_ID";

            if (isCumulative) {
              const amountInPesos = rawQty;
              return {
                debtorId,
                productId: null,
                productName: "Fiado Acumulado",
                quantity: 1,
                unitPriceCents: BigInt(Math.max(0, Math.round(amountInPesos * 100))),
                totalCents: BigInt(Math.max(0, Math.round(amountInPesos * 100))),
                addedAt: it.addedAt ? new Date(it.addedAt) : new Date(),
              };
            }

            // Unit or weight
            const isWeight = it.type === "Peso" || it.type === "Kilo";
            let unitPrice = Number(it.lockedPrice || 0);
            if (matchedProd) {
              const catalogPrice = Number(matchedProd.priceCents) / 100;
              unitPrice = Math.max(unitPrice, catalogPrice);
            }

            let totalInPesos = 0;
            let displayQty = 1;
            let displayUnitPrice = unitPrice;

            if (isWeight) {
              // rawQty is in grams (e.g. 250 g), unitPrice is in $/kg
              // total = (unitPrice / 1000) * rawQty
              totalInPesos = (unitPrice / 1000) * rawQty;
              displayQty = Math.max(1, Math.round(rawQty));
              displayUnitPrice = unitPrice;
              if (!pName) pName = "Producto por peso";
              pName = `${pName} (${displayQty}g)`;
            } else {
              displayQty = Math.max(1, Math.round(rawQty));
              totalInPesos = unitPrice * displayQty;
              if (!pName) pName = "Ítem fiado";
            }

            const totalCents = BigInt(Math.max(0, Math.round(totalInPesos * 100)));
            const unitPriceCents = BigInt(Math.max(0, Math.round(displayUnitPrice * 100)));

            return {
              debtorId,
              productId: matchedProd?.id || null,
              productName: pName,
              quantity: displayQty,
              unitPriceCents,
              totalCents,
              addedAt: it.addedAt ? new Date(it.addedAt) : new Date(),
            };
          });

          await db.debtorItem.createMany({ data: itemRows });
        }

        if (debtorId && Array.isArray(d.history) && d.history.length > 0) {
          const paymentRows = d.history.map((p: RawImportItem) => ({
            debtorId,
            amountCents: BigInt(Math.max(0, Math.round(Number(p.amount || 0) * 100))),
            date: p.date ? new Date(p.date) : new Date(),
            note: `Pago registrado (${p.type || "pago"})`,
          }));
          await db.debtorPayment.createMany({ data: paymentRows });
        }
      }
      return NextResponse.json({ ok: true, count: items.length });
    }

    if (kind === "expenses") {
      const expenseRows = items.map((exp: RawImportItem) => {
        const desc = String(exp.description || "").trim();
        const amount = Number(exp.amount || 0);
        const date = exp.date ? new Date(exp.date) : new Date();

        let category = "General";
        const descLower = desc.toLowerCase();
        if (descLower.includes("luz") || descLower.includes("agua") || descLower.includes("gas") || descLower.includes("aguanort") || descLower.includes("edesur")) {
          category = "Servicios (Luz, Agua, Gas)";
        } else if (descLower.includes("factura") || descLower.includes("afip") || descLower.includes("arba")) {
          category = "Facturas / Impuestos";
        } else if (descLower.includes("pollo") || descLower.includes("coca") || descLower.includes("pan") || descLower.includes("lays") || descLower.includes("queso") || descLower.includes("huevos") || descLower.includes("dia") || descLower.includes("marcelo")) {
          category = "Mercadería / Proveedores";
        }

        return {
          organizationId: orgId,
          description: desc,
          amountCents: BigInt(Math.round(amount * 100)),
          category,
          date: isNaN(date.getTime()) ? new Date() : date,
        };
      });

      await db.expense.createMany({ data: expenseRows });
      return NextResponse.json({ ok: true, count: expenseRows.length });
    }

    if (kind === "sales") {
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
            openedAt: new Date(),
            closedAt: new Date(),
          },
        });
      }

      const allContacts = await db.contact.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      });
      const contactByName = new Map(
        allContacts.map((c) => [c.name.toLowerCase().trim(), c.id])
      );

      const existingSales = await db.sale.findMany({
        where: { organizationId: orgId },
        select: { idempotencyKey: true, number: true },
      });
      const existingKeys = new Set(existingSales.map((s) => s.idempotencyKey));
      let saleNum = existingSales.reduce((max, s) => Math.max(max, s.number), 0);

      const saleRows: Prisma.SaleCreateManyInput[] = [];
      const itemRows: Prisma.SaleItemCreateManyInput[] = [];
      const paymentRows: Prisma.PaymentCreateManyInput[] = [];

      for (const s of items) {
        const key = `marierp_${s.id}`;
        if (existingKeys.has(key)) continue;

        saleNum++;
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
        }

        const saleDate = s.timestamp ? new Date(s.timestamp) : new Date();

        saleRows.push({
          id: saleId,
          organizationId: orgId,
          sessionId: histSession.id,
          cashierId: userId,
          contactId,
          number: saleNum,
          status: "COMPLETED",
          subtotalCents: totalCents,
          discountCents: BigInt(0),
          totalCents,
          taxCents,
          changeCents: BigInt(0),
          note: s.notes || (s.type !== "Venta" ? s.type : null),
          idempotencyKey: key,
          createdAt: saleDate,
        });

        if (Array.isArray(s.items) && s.items.length > 0) {
          for (const it of s.items) {
            const itemPrice = BigInt(Math.max(0, Math.round(Number(it.price || 0) * 100)));
            const qty = Math.max(1, Math.round(Number(it.quantity || 1)));
            const itemTotal = itemPrice * BigInt(qty);

            itemRows.push({
              id: crypto.randomUUID(),
              saleId,
              productId: null,
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

        existingKeys.add(key);
      }

      if (saleRows.length > 0) {
        await db.sale.createMany({ data: saleRows });
        if (itemRows.length > 0) {
          await db.saleItem.createMany({ data: itemRows });
        }
        if (paymentRows.length > 0) {
          await db.payment.createMany({ data: paymentRows });
        }
        await db.organization.update({
          where: { id: orgId },
          data: { saleCounter: saleNum },
        });
      }

      return NextResponse.json({ ok: true, count: saleRows.length });
    }

    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  } catch (error) {
    console.error("[chunk import error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
