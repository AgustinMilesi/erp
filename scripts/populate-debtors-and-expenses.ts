import fs from "fs";
import { db } from "../lib/db";

async function main() {
  const filePath = "d:/Proyectos/marierp/lo-de-mari-backup-2026-10-15.json";
  if (!fs.existsSync(filePath)) {
    console.error("Backup file not found at", filePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);

  const org = await db.organization.findFirst();
  if (!org) {
    console.error("No org found");
    process.exit(1);
  }
  const orgId = org.id;

  console.log(`Populating Debtors and Expenses for org ${org.name} (${orgId})...`);

  // 1. Debtors
  const debtors = (data.loDeMari_debtors || []) as Array<{
    id: string;
    name: string;
    saldoFavor?: number;
    items?: Array<{
      id: string;
      productId?: string;
      quantity: number;
      type?: string;
      addedAt?: string;
      lockedPrice: number;
    }>;
    history?: Array<{
      type: string;
      date: string;
      amount: number;
    }>;
  }>;

  console.log(`Processing ${debtors.length} debtors...`);
  // Clean existing debtors to ensure fresh 1:1 state
  await db.debtor.deleteMany({ where: { organizationId: orgId } });

  for (const d of debtors) {
    const name = String(d.name || "").trim();
    if (!name) continue;

    const saldoFavorCents = BigInt(Math.max(0, Math.round(Number(d.saldoFavor || 0) * 100)));
    const externalId = `debtor_${d.id}`;

    const createdDebtor = await db.debtor.create({
      data: {
        organizationId: orgId,
        name,
        saldoFavorCents,
        externalId,
        notes: `Cuenta corriente marierp. ${d.items?.length || 0} ítems fiados.`,
      },
      select: { id: true },
    });

    // Create debtor items
    if (Array.isArray(d.items) && d.items.length > 0) {
      const itemRows = d.items.map((it) => {
        const qty = Math.max(1, Math.round(Number(it.quantity || 1)));
        const unitPriceCents = BigInt(Math.max(0, Math.round(Number(it.lockedPrice || 0) * 100)));
        const totalCents = unitPriceCents * BigInt(qty);

        return {
          debtorId: createdDebtor.id,
          productId: null,
          productName: `Ítem fiado (${it.type || "Unidad"})`,
          quantity: qty,
          unitPriceCents,
          totalCents,
          addedAt: it.addedAt ? new Date(it.addedAt) : new Date(),
        };
      });

      await db.debtorItem.createMany({ data: itemRows });
    }

    // Create debtor payments
    if (Array.isArray(d.history) && d.history.length > 0) {
      const paymentRows = d.history.map((p) => {
        return {
          debtorId: createdDebtor.id,
          amountCents: BigInt(Math.max(0, Math.round(Number(p.amount || 0) * 100))),
          date: p.date ? new Date(p.date) : new Date(),
          note: `Pago de deuda registrado (${p.type})`,
        };
      });

      await db.debtorPayment.createMany({ data: paymentRows });
    }
  }

  console.log(`Debtors in DB: ${await db.debtor.count({ where: { organizationId: orgId } })}`);
  console.log(`Debtor Items in DB: ${await db.debtorItem.count()}`);
  console.log(`Debtor Payments in DB: ${await db.debtorPayment.count()}`);

  // 2. Expenses / Facturas
  console.log(`Processing expenses / facturas...`);
  await db.expense.deleteMany({ where: { organizationId: orgId } });

  const allExpenses = data.loDeMari_allExpenses || {};
  const expenseRows: Array<any> = [];

  for (const [dateStr, expList] of Object.entries(allExpenses)) {
    if (!Array.isArray(expList)) continue;
    const date = new Date(dateStr);

    for (const exp of expList as Array<{ description?: string; amount?: number }>) {
      const desc = String(exp.description || "").trim();
      const amount = Number(exp.amount || 0);
      if (!desc || amount <= 0) continue;

      let category = "General";
      const descLower = desc.toLowerCase();
      if (descLower.includes("luz") || descLower.includes("agua") || descLower.includes("gas") || descLower.includes("aguanort") || descLower.includes("edesur")) {
        category = "Servicios (Luz, Agua, Gas)";
      } else if (descLower.includes("factura") || descLower.includes("afip") || descLower.includes("arba")) {
        category = "Facturas / Impuestos";
      } else if (descLower.includes("pollo") || descLower.includes("coca") || descLower.includes("pan") || descLower.includes("lays") || descLower.includes("queso") || descLower.includes("huevos") || descLower.includes("dia") || descLower.includes("marcelo")) {
        category = "Mercadería / Proveedores";
      }

      expenseRows.push({
        organizationId: orgId,
        description: desc,
        amountCents: BigInt(Math.round(amount * 100)),
        category,
        date: isNaN(date.getTime()) ? new Date() : date,
      });
    }
  }

  console.log(`Inserting ${expenseRows.length} expense rows in batches...`);
  const CHUNK = 500;
  for (let i = 0; i < expenseRows.length; i += CHUNK) {
    const slice = expenseRows.slice(i, i + CHUNK);
    await db.expense.createMany({ data: slice });
  }

  console.log(`Expenses in DB: ${await db.expense.count({ where: { organizationId: orgId } })}`);
}

main()
  .catch((e) => {
    console.error("FATAL ERROR in debtors/expenses populator:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
