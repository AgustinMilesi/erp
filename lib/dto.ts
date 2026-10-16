import type { Contact, Message, Payment, Product, Sale, SaleItem } from "@prisma/client";

// The public shape of our data. Keeping it separate from the database model
// means tables can change later without breaking the ERP.
export const toContactDto = (c: Contact) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  company: c.company,
  notes: c.notes,
  external_id: c.externalId,
  created_at: c.createdAt.toISOString(),
  updated_at: c.updatedAt.toISOString(),
});

export const toMessageDto = (m: Message) => ({
  id: m.id,
  contact_id: m.contactId,
  form_id: m.formId,
  name: m.name,
  email: m.email,
  subject: m.subject,
  message: m.body,
  status: m.status.toLowerCase(),
  created_at: m.createdAt.toISOString(),
});

export const toProductDto = (p: Product) => ({
  id: p.id,
  sku: p.sku,
  barcode: p.barcode,
  name: p.name,
  price_cents: Number(p.priceCents),
  cost_cents: Number(p.costCents),
  // Percentage, for example 21 or 10.5
  tax_rate: p.taxRateBp / 100,
  stock: p.stock,
  min_stock: p.minStock,
  track_stock: p.trackStock,
  active: p.active,
  category_id: p.categoryId,
  external_id: p.externalId,
  created_at: p.createdAt.toISOString(),
  updated_at: p.updatedAt.toISOString(),
});

export const toSaleDto = (s: Sale & { items: SaleItem[]; payments: Payment[] }) => ({
  id: s.id,
  number: s.number,
  status: s.status.toLowerCase(),
  contact_id: s.contactId,
  subtotal_cents: Number(s.subtotalCents),
  discount_cents: Number(s.discountCents),
  total_cents: Number(s.totalCents),
  tax_cents: Number(s.taxCents),
  change_cents: Number(s.changeCents),
  items: s.items.map((item) => ({
    product_id: item.productId,
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    unit_price_cents: Number(item.unitPriceCents),
    tax_rate: item.taxRateBp / 100,
    total_cents: Number(item.totalCents),
  })),
  payments: s.payments.map((payment) => ({
    method: payment.method.toLowerCase(),
    amount_cents: Number(payment.amountCents),
  })),
  created_at: s.createdAt.toISOString(),
  voided_at: s.voidedAt ? s.voidedAt.toISOString() : null,
});
