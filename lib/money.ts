// Money is always handled as whole cents (integers), never as floating point pesos.

const LOCALE = "es-AR";
const MAX_CENTS = 1_000_000_000_000_00; // one trillion, far above any real sale

export function formatMoney(
  cents: number | bigint,
  currency = "ARS",
  showDecimals = false
) {
  const fractionDigits = showDecimals ? 2 : 0;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(cents) / 100);
}

// marierp rounding rule: rounds up/down to clean 50/100 peso steps
export function roundPrice(price: number): number {
  if (price <= 0) return 0;
  const remainder = price % 100;
  const base = Math.floor(price / 100) * 100;
  if (remainder === 0) return price;
  if (remainder <= 50) return base + 50;
  return base + 100;
}

// Turns what a person types ("1.234,50", "1234.5", "$ 80") into cents.
// Returns null when it can't be read as a positive amount.
export function parseMoney(raw: string): number | null {
  if (raw.includes("-")) return null;
  const text = raw.replace(/[^\d.,]/g, "");
  if (!/\d/.test(text)) return null;

  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  const last = Math.max(lastDot, lastComma);

  let whole = text;
  let decimals = "";
  let groupMark: string | null = null;

  if (last !== -1) {
    const mark = text[last];
    const other = mark === "." ? "," : ".";
    const after = text.length - last - 1;
    const repeated = text.split(mark).length - 1 > 1;
    const hasOther = text.includes(other);

    // Both marks present: the last one is the decimal point, the other groups thousands.
    // Only one kind: a repeated mark or exactly three digits after it means thousands.
    if (!hasOther && (repeated || after === 3)) {
      groupMark = mark;
    } else {
      if (repeated || after > 2) return null;
      whole = text.slice(0, last);
      decimals = text.slice(last + 1);
      if (hasOther) groupMark = other;
    }
  }

  // Thousands groups must look like 1.234.567: one to three digits, then groups of three.
  if (groupMark) {
    const groups = whole.split(groupMark);
    const valid = groups.every((group, i) => (i === 0 ? /^\d{1,3}$/ : /^\d{3}$/).test(group));
    if (!valid) return null;
    whole = groups.join("");
  } else if (/[.,]/.test(whole)) {
    return null;
  }

  const cents = Number(whole || "0") * 100 + Number(decimals.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null;
  return cents;
}

// "12,5" -> 12.5 shown back in the input, as pesos with two decimals
export const centsToInput = (cents: number | bigint) => (Number(cents) / 100).toFixed(2).replace(".", ",");
