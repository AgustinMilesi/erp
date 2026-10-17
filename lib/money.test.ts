import assert from "node:assert/strict";
import { test } from "node:test";
import { centsToInput, formatMoney, parseMoney } from "./money";

test("reads amounts the way people type them", () => {
  assert.equal(parseMoney("1234,50"), 123450);
  assert.equal(parseMoney("1.234,50"), 123450);
  assert.equal(parseMoney("1,234.50"), 123450);
  assert.equal(parseMoney("1234.5"), 123450);
  assert.equal(parseMoney("$ 80"), 8000);
  assert.equal(parseMoney("0,99"), 99);
  assert.equal(parseMoney("12,"), 1200);
});

test("treats a single mark followed by three digits as thousands", () => {
  assert.equal(parseMoney("1.234"), 123400);
  assert.equal(parseMoney("1,234"), 123400);
  assert.equal(parseMoney("1.234.567"), 123456700);
});

test("rejects things that are not amounts", () => {
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("abc"), null);
  assert.equal(parseMoney("-5"), null);
  assert.equal(parseMoney("1,2345"), null);
  assert.equal(parseMoney("1,50,25"), null);
});

test("shows cents back as an input value", () => {
  assert.equal(centsToInput(123450), "1234,50");
  assert.equal(centsToInput(5), "0,05");
  assert.match(formatMoney(123450, "ARS", true), /1\.234,50/);
});
