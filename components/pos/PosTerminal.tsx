"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ui } from "@/components/ui";
import {
  createSale,
  findProductByCode,
  searchCustomers,
  searchProducts,
  type TillProduct,
} from "@/app/actions/pos";
import { centsToInput, formatMoney, parseMoney } from "@/lib/money";
import { allocatePayments, computeTotals, type PaymentMethodName } from "@/lib/pos/sale-math";
import { usePreferences } from "@/components/PreferencesProvider";

type Line = TillProduct & { quantity: number };
type PayRow = { id: number; method: PaymentMethodName; amount: string };
type Customer = { id: string; name: string };
type CustomerHit = Customer & { email: string };
type Done = { id: string; number: string; changeCents: number; totalCents: number };

const newKey = () => crypto.randomUUID().replace(/-/g, "");

export function PosTerminal({
  currency,
  showDecimals = false,
  allowNegativeStock,
  canDiscount,
}: {
  currency: string;
  showDecimals?: boolean;
  allowNegativeStock: boolean;
  canDiscount: boolean;
}) {
  const { t } = usePreferences();
  const money = (cents: number) => formatMoney(cents, currency, showDecimals);

  const methods: { value: PaymentMethodName; label: string }[] = [
    { value: "CASH", label: t.methodCash },
    { value: "CARD", label: t.methodCard },
    { value: "TRANSFER", label: t.methodTransfer },
    { value: "OTHER", label: t.methodOther },
  ];

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TillProduct[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerHit[]>([]);
  const [stage, setStage] = useState<"cart" | "pay" | "done">("cart");
  const [rows, setRows] = useState<PayRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  // Changes whenever the cart does, so a retry of the same sale can never be recorded twice
  // but a different sale never reuses an old key.
  const [saleKey, setSaleKey] = useState(newKey);

  const searchBox = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);
  const rowSeq = useRef(1);

  // Product search, a moment after the cashier stops typing
  useEffect(() => {
    const seq = ++searchSeq.current;
    const timer = setTimeout(
      async () => {
        try {
          const found = await searchProducts(query);
          if (seq === searchSeq.current) setResults(found);
        } catch {
          if (seq === searchSeq.current) setResults([]);
        }
      },
      query ? 220 : 0,
    );
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (customerQuery.trim().length < 2) return;
    const timer = setTimeout(async () => {
      try {
        setCustomerResults(await searchCustomers(customerQuery));
      } catch {
        setCustomerResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  const discountCents = canDiscount && discount.trim() ? parseMoney(discount) : 0;
  const discountInvalid = discountCents === null;
  const totals = computeTotals(
    lines.map((l) => ({ unitPriceCents: l.priceCents, quantity: l.quantity, taxRateBp: 0 })),
    discountCents ?? 0,
  );

  const touch = () => setSaleKey(newKey());

  function add(product: TillProduct) {
    const current = lines.find((l) => l.id === product.id)?.quantity ?? 0;
    if (product.trackStock && !allowNegativeStock && current + 1 > product.stock) {
      toast.error(`Only ${product.stock} of ${product.name} in stock.`);
      return;
    }
    touch();
    setLines((prev) => {
      const found = prev.find((l) => l.id === product.id);
      if (found) return prev.map((l) => (l.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function setQuantity(id: string, raw: number) {
    if (!Number.isFinite(raw)) return;
    const line = lines.find((l) => l.id === id);
    if (!line) return;
    let quantity = Math.min(Math.max(Math.trunc(raw), 1), 100_000);
    if (line.trackStock && !allowNegativeStock && quantity > line.stock) {
      toast.error(`Only ${line.stock} of ${line.name} in stock.`);
      quantity = Math.max(line.stock, 1);
    }
    touch();
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, quantity } : l)));
  }

  function remove(id: string) {
    touch();
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  async function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const code = query.trim();
    if (!code) return;
    const exact = await findProductByCode(code).catch(() => null);
    const pick = exact ?? (results.length === 1 ? results[0] : null);
    if (!pick) {
      toast.error("No product matches that code.");
      return;
    }
    add(pick);
    setQuery("");
  }

  function startPayment() {
    if (lines.length === 0 || totals.totalCents <= 0 || discountInvalid) return;
    setRows([{ id: rowSeq.current++, method: "CASH", amount: centsToInput(totals.totalCents) }]);
    setStage("pay");
  }

  const tendered = rows.map((row) => ({ method: row.method, amountCents: parseMoney(row.amount) }));
  const unreadable = tendered.some((t) => t.amountCents === null);
  const allocation = unreadable
    ? null
    : allocatePayments(
        totals.totalCents,
        tendered.map((t) => ({ method: t.method, amountCents: t.amountCents ?? 0 })),
      );

  function addRow(method: PaymentMethodName) {
    const paid = tendered.reduce((sum, t) => sum + (t.amountCents ?? 0), 0);
    const left = Math.max(totals.totalCents - paid, 0);
    setRows((prev) => [...prev, { id: rowSeq.current++, method, amount: left > 0 ? centsToInput(left) : "" }]);
  }

  async function charge() {
    if (!allocation?.ok || busy) return;
    setBusy(true);
    try {
      const result = await createSale({
        idempotencyKey: saleKey,
        items: lines.map((l) => ({ productId: l.id, quantity: l.quantity })),
        payments: tendered.map((t) => ({ method: t.method, amountCents: t.amountCents ?? 0 })),
        discountCents: totals.discountCents,
        expectedTotalCents: totals.totalCents,
        contactId: customer?.id ?? null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Sale recorded.");
      setDone({
        id: result.data?.id ?? "",
        number: result.data?.number ?? "",
        changeCents: allocation.changeCents,
        totalCents: totals.totalCents,
      });
      setLines([]);
      setDiscount("");
      setCustomer(null);
      setCustomerQuery("");
      setCustomerResults([]);
      setRows([]);
      setSaleKey(newKey());
      setStage("done");
    } catch {
      // Nothing tells us whether it was saved. Retrying is safe: the same key is sent.
      toast.error("We couldn't reach the server. Try again, the sale won't be charged twice.");
    } finally {
      setBusy(false);
    }
  }

  function newSale() {
    setDone(null);
    setStage("cart");
    setQuery("");
    searchBox.current?.focus();
  }

  return (
    <div className="grid lg:grid-cols-[1fr_440px] lg:min-h-[calc(100vh-57px)]">
      <section className="p-4 md:p-8 space-y-6 lg:border-r border-white/10">
        <form onSubmit={submitSearch} className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="till-search" className={ui.label}>{t.scanOrSearch}</label>
            <input
              id="till-search"
              ref={searchBox}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              autoComplete="off"
              maxLength={100}
              placeholder={t.barcodeSkuName}
              className={ui.input}
            />
          </div>
          <button type="submit" className={ui.ghost}>{t.add}</button>
        </form>

        {results.length === 0 ? (
          <p className={ui.muted}>{query ? t.noProductsMatch : t.noProductsYetPos}</p>
        ) : (
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {results.map((product) => {
              const out = product.trackStock && product.stock <= 0 && !allowNegativeStock;
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    disabled={out || stage !== "cart"}
                    onClick={() => add(product)}
                    className={`${ui.card} w-full text-left p-4 transition hover:border-rose-400/60 disabled:opacity-40 disabled:hover:border-white/10`}
                  >
                    <span className="block text-white truncate">{product.name}</span>
                    <span className="block text-sm text-slate-500 truncate">{product.sku}</span>
                    <span className="mt-3 flex items-baseline justify-between gap-2">
                      <span className="text-lg text-white font-semibold">{money(product.priceCents)}</span>
                      {product.trackStock && (
                        <span className={`text-xs ${out ? "text-rose-400" : "text-slate-500"}`}>
                          {out ? t.outOfStock : `${product.stock} ${t.inStock}`}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="p-4 md:p-8 flex flex-col gap-6 bg-white/[0.02]">
        {stage === "done" && done ? (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className={ui.label}>{t.saleRecorded}</p>
              <p className="text-5xl font-light text-white">#{done.number}</p>
              <p className="text-xl text-white">{money(done.totalCents)}</p>
            </div>
            {done.changeCents > 0 && (
              <div className={`${ui.card} p-6`}>
                <p className={ui.label}>{t.giveBack}</p>
                <p className="text-4xl font-black text-rose-400">{money(done.changeCents)}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={newSale} className={ui.button}>{t.newSale}</button>
              {done.id && (
                <Link href={`/pos/receipt/${done.id}`} target="_blank" className={ui.ghost}>{t.receipt}</Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className={ui.label}>{stage === "pay" ? t.payment : t.cart}</p>
              {lines.length > 0 && stage === "cart" && (
                <button
                  type="button"
                  className="text-xs uppercase tracking-wider text-slate-400 hover:text-rose-400 transition"
                  onClick={() => {
                    touch();
                    setLines([]);
                  }}
                >
                  {t.clear}
                </button>
              )}
            </div>

            {lines.length === 0 ? (
              <p className={ui.muted}>{t.scanToStart}</p>
            ) : (
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {lines.map((line) => (
                  <li key={line.id} className="py-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-white min-w-0 break-words">{line.name}</span>
                      <span className="text-white whitespace-nowrap">{money(line.priceCents * line.quantity)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-500">{money(line.priceCents)} {t.each}</span>
                      {stage === "cart" ? (
                        <span className="flex items-center gap-2">
                          <button type="button" aria-label={t.oneLess} className={`${ui.ghost} !px-3`} onClick={() => (line.quantity > 1 ? setQuantity(line.id, line.quantity - 1) : remove(line.id))}>−</button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            aria-label={`Quantity of ${line.name}`}
                            value={line.quantity}
                            onChange={(e) => setQuantity(line.id, Number(e.target.value))}
                            className="w-16 bg-transparent border-b border-white/10 text-center text-white outline-none focus:border-rose-400"
                          />
                          <button type="button" aria-label={t.oneMore} className={`${ui.ghost} !px-3`} onClick={() => setQuantity(line.id, line.quantity + 1)}>+</button>
                          <button type="button" aria-label={t.removeLine} className="text-slate-500 hover:text-rose-400 transition px-1" onClick={() => remove(line.id)}>✕</button>
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">× {line.quantity}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {stage === "cart" && lines.length > 0 && (
              <div className="space-y-4">
                {canDiscount && (
                  <div>
                    <label htmlFor="till-discount" className={ui.label}>{t.discountOptional}</label>
                    <input
                      id="till-discount"
                      value={discount}
                      onChange={(e) => {
                        touch();
                        setDiscount(e.target.value);
                      }}
                      inputMode="decimal"
                      placeholder="0,00"
                      className={ui.input}
                    />
                    {discountInvalid && <p className={ui.error}>That isn&apos;t a valid amount.</p>}
                  </div>
                )}

                <div>
                  <label htmlFor="till-customer" className={ui.label}>{t.customerOptional}</label>
                  {customer ? (
                    <div className="flex items-center justify-between gap-3 py-3 border-b border-white/10">
                      <span className="text-white truncate">{customer.name}</span>
                      <button type="button" className="text-xs uppercase tracking-wider text-slate-400 hover:text-rose-400 transition" onClick={() => { touch(); setCustomer(null); }}>{t.cancel}</button>
                    </div>
                  ) : (
                    <>
                      <input
                        id="till-customer"
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)}
                        autoComplete="off"
                        placeholder={t.searchCustomerPlaceholder}
                        className={ui.input}
                      />
                      {customerQuery.trim().length >= 2 && customerResults.length > 0 && (
                        <ul className="divide-y divide-white/10 border-y border-white/10 mt-2">
                          {customerResults.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                className="w-full text-left py-2 text-slate-200 hover:text-rose-400 transition truncate"
                                onClick={() => {
                                  touch();
                                  setCustomer({ id: c.id, name: c.name });
                                  setCustomerQuery("");
                                  setCustomerResults([]);
                                }}
                              >
                                {c.name} <span className="text-slate-500 text-sm">{c.email}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {lines.length > 0 && (
              <div className="space-y-2 pt-2">
                {totals.discountCents > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-slate-400"><span>{t.subtotal}</span><span>{money(totals.subtotalCents)}</span></div>
                    <div className="flex justify-between text-sm text-slate-400"><span>{t.discount}</span><span>− {money(totals.discountCents)}</span></div>
                  </>
                )}
                <div className="flex items-baseline justify-between">
                  <span className={ui.label}>{t.total}</span>
                  <span className="text-4xl font-black text-white">{money(totals.totalCents)}</span>
                </div>
              </div>
            )}

            {stage === "cart" && (
              <button
                type="button"
                disabled={lines.length === 0 || totals.totalCents <= 0 || discountInvalid}
                onClick={startPayment}
                className={`${ui.button} w-full`}
              >
                {t.charge}
              </button>
            )}

            {stage === "pay" && (
              <div className="space-y-5">
                <ul className="space-y-3">
                  {rows.map((row) => (
                    <li key={row.id} className="flex items-end gap-3">
                      <div className="w-32">
                        <label className={ui.label} htmlFor={`method-${row.id}`}>{t.method}</label>
                        <select
                          id={`method-${row.id}`}
                          value={row.method}
                          onChange={(e) =>
                            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, method: e.target.value as PaymentMethodName } : r)))
                          }
                          className={`${ui.input} !text-base`}
                        >
                          {methods.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className={ui.label} htmlFor={`amount-${row.id}`}>{t.amount}</label>
                        <input
                          id={`amount-${row.id}`}
                          value={row.amount}
                          inputMode="decimal"
                          autoFocus={row.id === rows[0]?.id}
                          onChange={(e) =>
                            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r)))
                          }
                          className={ui.input}
                        />
                      </div>
                      {rows.length > 1 && (
                        <button type="button" aria-label={t.cancel} className="pb-3 text-slate-500 hover:text-rose-400 transition" onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}>✕</button>
                      )}
                    </li>
                  ))}
                </ul>

                {rows.length < 6 && (
                  <button type="button" className={ui.ghost} onClick={() => addRow("CARD")}>{t.splitPayment}</button>
                )}

                <div className="min-h-12">
                  {unreadable ? (
                    <p className={ui.error}>Invalid amount.</p>
                  ) : allocation?.ok ? (
                    allocation.changeCents > 0 ? (
                      <p className="text-slate-300">{t.changeToReturn}: <span className="text-rose-400 font-semibold">{money(allocation.changeCents)}</span></p>
                    ) : (
                      <p className="text-slate-300">{t.exactAmount}</p>
                    )
                  ) : (
                    <p className={ui.error}>
                      {allocation?.shortCents ? `${money(allocation.shortCents)} (${t.remainingDue})` : allocation?.error}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="button" className={ui.ghost} disabled={busy} onClick={() => setStage("cart")}>{t.back}</button>
                  <button type="button" className={`${ui.button} flex-1`} disabled={!allocation?.ok || busy} onClick={charge}>
                    {busy ? t.saving : t.confirmSale}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
