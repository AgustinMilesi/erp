// Totals, tax and payments for a sale. Pure functions with no database and no
// framework, so the till and the server run exactly the same rules.

export type PaymentMethodName = "CASH" | "CARD" | "TRANSFER" | "OTHER";

export type PricedLine = {
  unitPriceCents: number;
  quantity: number;
  taxRateBp: number;
  saleType?: string;
};

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  // Tax that is already inside the total
  taxCents: number;
  lineTotals: number[];
};

// Tax inside a price that already includes it. 2100 basis points = 21%.
export function includedTax(grossCents: number, taxRateBp: number) {
  if (taxRateBp <= 0) return 0;
  return grossCents - Math.round((grossCents * 10_000) / (10_000 + taxRateBp));
}

// Spreads a discount over the lines in proportion to their value.
// Whatever is left over after rounding goes one cent at a time to the first lines.
export function spreadDiscount(lineTotals: number[], discountCents: number) {
  const subtotal = lineTotals.reduce((sum, value) => sum + value, 0);
  if (discountCents <= 0 || subtotal <= 0) return lineTotals.map(() => 0);

  const shares = lineTotals.map((value) => Math.floor((value * discountCents) / subtotal));
  let rest = discountCents - shares.reduce((sum, value) => sum + value, 0);
  for (let i = 0; rest > 0 && i < shares.length; i++) {
    if (shares[i] < lineTotals[i]) {
      shares[i] += 1;
      rest -= 1;
    }
  }
  return shares;
}

export function computeTotals(lines: PricedLine[], discountCents = 0): Totals {
  const lineTotals = lines.map((line) => {
    if (line.saleType === "WEIGHT") {
      // unitPriceCents is price per kilo (1000g). quantity is in grams.
      return Math.round((line.unitPriceCents * line.quantity) / 1000);
    }
    return Math.round(line.unitPriceCents * line.quantity);
  });
  const subtotalCents = lineTotals.reduce((sum, value) => sum + value, 0);
  const discount = Math.min(Math.max(discountCents, 0), subtotalCents);
  const shares = spreadDiscount(lineTotals, discount);

  const taxCents = lines.reduce(
    (sum, line, i) => sum + includedTax(lineTotals[i] - shares[i], line.taxRateBp),
    0,
  );

  return {
    subtotalCents,
    discountCents: discount,
    totalCents: subtotalCents - discount,
    taxCents,
    lineTotals,
  };
}

export type Tender = { method: PaymentMethodName; amountCents: number };

export type Allocation =
  | { ok: true; payments: Tender[]; changeCents: number }
  | { ok: false; error: string; shortCents?: number };

// Works out what really counts toward the total and how much change to give.
// Card, transfer and other methods can't be more than what is owed. Cash can,
// and the extra goes back as change.
export function allocatePayments(totalCents: number, tendered: Tender[]): Allocation {
  if (totalCents <= 0) return { ok: false, error: "The total has to be more than zero." };
  if (tendered.length === 0) return { ok: false, error: "Add a payment." };

  for (const tender of tendered) {
    if (!Number.isSafeInteger(tender.amountCents) || tender.amountCents <= 0) {
      return { ok: false, error: "Every payment needs an amount above zero." };
    }
  }

  const cashTendered = tendered
    .filter((t) => t.method === "CASH")
    .reduce((sum, t) => sum + t.amountCents, 0);
  const others = tendered.filter((t) => t.method !== "CASH");
  const othersTotal = others.reduce((sum, t) => sum + t.amountCents, 0);

  if (othersTotal > totalCents) {
    return { ok: false, error: "Card, transfer and other payments can't be more than the total." };
  }

  const cashDue = totalCents - othersTotal;
  if (cashTendered < cashDue) {
    return {
      ok: false,
      error: "The payments don't cover the total.",
      shortCents: cashDue - cashTendered,
    };
  }

  const payments: Tender[] = [...others];
  if (cashDue > 0) payments.unshift({ method: "CASH", amountCents: cashDue });

  return { ok: true, payments, changeCents: cashTendered - cashDue };
}
