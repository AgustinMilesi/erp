import assert from "node:assert/strict";
import { test } from "node:test";
import { allocatePayments, computeTotals, includedTax, spreadDiscount } from "./sale-math";

test("finds the tax that is already inside a price", () => {
  assert.equal(includedTax(12100, 2100), 2100);
  assert.equal(includedTax(11050, 1050), 1050);
  assert.equal(includedTax(5000, 0), 0);
});

test("adds up lines and keeps the discount within the subtotal", () => {
  const lines = [
    { unitPriceCents: 1000, quantity: 3, taxRateBp: 2100 },
    { unitPriceCents: 250, quantity: 2, taxRateBp: 1050 },
  ];
  const plain = computeTotals(lines);
  assert.equal(plain.subtotalCents, 3500);
  assert.equal(plain.totalCents, 3500);

  const discounted = computeTotals(lines, 500);
  assert.equal(discounted.discountCents, 500);
  assert.equal(discounted.totalCents, 3000);

  const tooMuch = computeTotals(lines, 99999);
  assert.equal(tooMuch.totalCents, 0);
});

test("spreads a discount without losing a cent", () => {
  const shares = spreadDiscount([1000, 1000, 1000], 100);
  assert.equal(shares.reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(shares, [34, 33, 33]);

  const uneven = spreadDiscount([10, 5000], 7);
  assert.equal(uneven.reduce((a, b) => a + b, 0), 7);
});

test("cash over the total comes back as change", () => {
  const result = allocatePayments(3500, [{ method: "CASH", amountCents: 5000 }]);
  assert.deepEqual(result, {
    ok: true,
    payments: [{ method: "CASH", amountCents: 3500 }],
    changeCents: 1500,
  });
});

test("mixed payments: the rest is paid in cash", () => {
  const result = allocatePayments(10000, [
    { method: "CARD", amountCents: 6000 },
    { method: "CASH", amountCents: 5000 },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.changeCents, 1000);
    assert.deepEqual(result.payments, [
      { method: "CASH", amountCents: 4000 },
      { method: "CARD", amountCents: 6000 },
    ]);
  }
});

test("a card can't pay more than what is owed", () => {
  const result = allocatePayments(1000, [{ method: "CARD", amountCents: 1500 }]);
  assert.equal(result.ok, false);
});

test("reports how much is missing", () => {
  const result = allocatePayments(1000, [
    { method: "CARD", amountCents: 400 },
    { method: "CASH", amountCents: 100 },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.shortCents, 500);
});

test("refuses empty, zero and negative payments", () => {
  assert.equal(allocatePayments(1000, []).ok, false);
  assert.equal(allocatePayments(1000, [{ method: "CASH", amountCents: 0 }]).ok, false);
  assert.equal(allocatePayments(1000, [{ method: "CASH", amountCents: -5 }]).ok, false);
  assert.equal(allocatePayments(0, [{ method: "CASH", amountCents: 100 }]).ok, false);
});

test("two cash payments are merged into one", () => {
  const result = allocatePayments(1000, [
    { method: "CASH", amountCents: 600 },
    { method: "CASH", amountCents: 600 },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.payments, [{ method: "CASH", amountCents: 1000 }]);
    assert.equal(result.changeCents, 200);
  }
});
