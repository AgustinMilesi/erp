"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ui } from "@/components/ui";
import {
  createSale,
  findProductByCode,
  searchProducts,
  type TillProduct,
} from "@/app/actions/pos";
import { centsToInput, formatMoney, parseMoney } from "@/lib/money";
import { computeTotals } from "@/lib/pos/sale-math";
import { usePreferences } from "@/components/PreferencesProvider";

export type Line = TillProduct & { quantity: number };

export type PaymentMethodType = "CASH" | "TRANSFER" | "CARD";

export type PosTab = {
  id: string;
  label: string;
  lines: Line[];
  paymentMethod: PaymentMethodType;
  debtorId: string;
  discount: string;
  saleKey: string;
};

export type PendingSale = {
  id: string;
  lines: Line[];
  totalCents: number;
  timeStr: string;
  paymentMethod: PaymentMethodType;
  debtorId?: string;
  debtorName?: string;
};

type DoneSale = {
  id: string;
  number: string;
  totalCents: number;
  changeCents: number;
  methodLabel: string;
};

const newKey = () => crypto.randomUUID().replace(/-/g, "");

const STORAGE_KEY_TABS = "marierp_pos_tabs_v2";
const STORAGE_KEY_PENDING = "marierp_pos_pending_v2";

export function PosTerminal({
  currency,
  showDecimals = false,
  allowNegativeStock,
  canDiscount,
  debtors = [],
}: {
  currency: string;
  showDecimals?: boolean;
  allowNegativeStock: boolean;
  canDiscount: boolean;
  debtors?: { id: string; name: string; saldoFavorCents: number }[];
}) {
  const { t } = usePreferences();
  const money = (cents: number | bigint) => formatMoney(cents, currency, showDecimals);

  // Tabs state: Pedido 1, Pedido 2, Pedido 3
  const [tabs, setTabs] = useState<PosTab[]>([
    {
      id: "tab-1",
      label: "Pedido 1",
      lines: [],
      paymentMethod: "CASH",
      debtorId: "",
      discount: "",
      saleKey: newKey(),
    },
    {
      id: "tab-2",
      label: "Pedido 2",
      lines: [],
      paymentMethod: "CASH",
      debtorId: "",
      discount: "",
      saleKey: newKey(),
    },
    {
      id: "tab-3",
      label: "Pedido 3",
      lines: [],
      paymentMethod: "CASH",
      debtorId: "",
      discount: "",
      saleKey: newKey(),
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");

  // Pending sales
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);

  // Search & input state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TillProduct[]>([]);
  const [quantityInput, setQuantityInput] = useState("1");
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Modals & busy state
  const [busy, setBusy] = useState(false);
  const [doneSale, setDoneSale] = useState<DoneSale | null>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCash, setSplitCash] = useState("");
  const [splitTransfer, setSplitTransfer] = useState("");
  const [splitPosnet, setSplitPosnet] = useState("");

  const searchBox = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  // Load state from localStorage on initial client mount
  useEffect(() => {
    try {
      const savedTabs = localStorage.getItem(STORAGE_KEY_TABS);
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed);
          setActiveTabId(parsed[0].id);
        }
      }
      const savedPending = localStorage.getItem(STORAGE_KEY_PENDING);
      if (savedPending) {
        const parsedPending = JSON.parse(savedPending);
        if (Array.isArray(parsedPending)) {
          setPendingSales(parsedPending);
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  // Save tabs & pending to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(tabs));
    } catch {
      // Ignored
    }
  }, [tabs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(pendingSales));
    } catch {
      // Ignored
    }
  }, [pendingSales]);

  // Product search debounce
  useEffect(() => {
    const seq = ++searchSeq.current;
    const timer = setTimeout(
      async () => {
        try {
          const found = await searchProducts(query);
          if (seq === searchSeq.current) {
            setResults(found);
            if (found.length > 0 && !selectedProductId) {
              setSelectedProductId(found[0].id);
            }
          }
        } catch {
          if (seq === searchSeq.current) setResults([]);
        }
      },
      query ? 180 : 0,
    );
    return () => clearTimeout(timer);
  }, [query, selectedProductId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  function updateActiveTab(updates: Partial<PosTab>) {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, ...updates } : t)),
    );
  }

  const discountCents = canDiscount && activeTab.discount.trim() ? parseMoney(activeTab.discount) : 0;
  const totals = computeTotals(
    activeTab.lines.map((l) => ({ unitPriceCents: l.priceCents, quantity: l.quantity, taxRateBp: 0 })),
    discountCents ?? 0,
  );

  function addProductToCart(product: TillProduct, qty = 1) {
    if (qty <= 0) return;
    const current = activeTab.lines.find((l) => l.id === product.id)?.quantity ?? 0;
    if (product.trackStock && !allowNegativeStock && current + qty > product.stock) {
      toast.error(`Solo quedan ${product.stock} de "${product.name}" en stock.`);
      return;
    }

    const updatedLines = [...activeTab.lines];
    const existingIndex = updatedLines.findIndex((l) => l.id === product.id);
    if (existingIndex >= 0) {
      updatedLines[existingIndex] = {
        ...updatedLines[existingIndex],
        quantity: updatedLines[existingIndex].quantity + qty,
      };
    } else {
      updatedLines.push({ ...product, quantity: qty });
    }

    updateActiveTab({ lines: updatedLines, saleKey: newKey() });
    toast.success(`+${qty} ${product.name}`);
  }

  function adjustLineQty(lineId: string, amount: number) {
    const line = activeTab.lines.find((l) => l.id === lineId);
    if (!line) return;
    const newQty = line.quantity + amount;
    if (newQty <= 0) {
      removeLine(lineId);
      return;
    }
    if (line.trackStock && !allowNegativeStock && newQty > line.stock) {
      toast.error(`Stock máximo alcanzado (${line.stock}).`);
      return;
    }
    const updatedLines = activeTab.lines.map((l) =>
      l.id === lineId ? { ...l, quantity: newQty } : l,
    );
    updateActiveTab({ lines: updatedLines, saleKey: newKey() });
  }

  function removeLine(lineId: string) {
    const updatedLines = activeTab.lines.filter((l) => l.id !== lineId);
    updateActiveTab({ lines: updatedLines, saleKey: newKey() });
  }

  function clearActiveTab() {
    updateActiveTab({
      lines: [],
      discount: "",
      debtorId: "",
      saleKey: newKey(),
    });
  }

  // Quick product submission from search box or button
  async function handleAddClick() {
    const qty = Math.max(1, parseInt(quantityInput, 10) || 1);
    if (selectedProductId) {
      const prod = results.find((r) => r.id === selectedProductId);
      if (prod) {
        addProductToCart(prod, qty);
        setQuantityInput("1");
        return;
      }
    }

    const term = query.trim();
    if (!term) return;
    const exact = await findProductByCode(term).catch(() => null);
    const pick = exact ?? (results.length > 0 ? results[0] : null);
    if (pick) {
      addProductToCart(pick, qty);
      setQuery("");
      setQuantityInput("1");
    } else {
      toast.error("Producto no encontrado.");
    }
  }

  // Direct 1-click checkout with active payment method
  async function handleQuickCharge(method = activeTab.paymentMethod) {
    if (activeTab.lines.length === 0 || totals.totalCents <= 0) {
      toast.error("El pedido está vacío.");
      return;
    }

    setBusy(true);
    const methodEnum = method === "CASH" ? "CASH" : method === "TRANSFER" ? "TRANSFER" : "CARD";
    const methodLabel = method === "CASH" ? "Efectivo" : method === "TRANSFER" ? "Transferencia" : "Posnet";

    try {
      const result = await createSale({
        idempotencyKey: activeTab.saleKey,
        items: activeTab.lines.map((l) => ({ productId: l.id, quantity: l.quantity })),
        payments: [{ method: methodEnum, amountCents: totals.totalCents }],
        discountCents: totals.discountCents,
        expectedTotalCents: totals.totalCents,
        note: `Venta directa (${methodLabel})`,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? `Venta de ${money(totals.totalCents)} registrada.`);
      setDoneSale({
        id: result.data?.id ?? "",
        number: result.data?.number ?? "",
        totalCents: totals.totalCents,
        changeCents: 0,
        methodLabel,
      });

      clearActiveTab();
    } catch {
      toast.error("Error al procesar la venta. Reintentá.");
    } finally {
      setBusy(false);
    }
  }

  // Send sale directly to Debtor account (Fiado)
  async function handleSendToDebtor() {
    if (!activeTab.debtorId) {
      toast.error("Seleccioná un cliente deudor de la lista.");
      return;
    }
    if (activeTab.lines.length === 0 || totals.totalCents <= 0) {
      toast.error("El pedido está vacío.");
      return;
    }

    const debtor = debtors.find((d) => d.id === activeTab.debtorId);
    if (!debtor) {
      toast.error("Cliente deudor no encontrado.");
      return;
    }

    setBusy(true);
    try {
      const result = await createSale({
        idempotencyKey: activeTab.saleKey,
        items: activeTab.lines.map((l) => ({ productId: l.id, quantity: l.quantity })),
        payments: [{ method: "OTHER", amountCents: totals.totalCents }],
        discountCents: totals.discountCents,
        expectedTotalCents: totals.totalCents,
        debtorId: debtor.id,
        note: `A cuenta de ${debtor.name}`,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`Venta de ${money(totals.totalCents)} enviada al fiado de ${debtor.name}.`);
      setDoneSale({
        id: result.data?.id ?? "",
        number: result.data?.number ?? "",
        totalCents: totals.totalCents,
        changeCents: 0,
        methodLabel: `Fiado (${debtor.name})`,
      });

      clearActiveTab();
    } catch {
      toast.error("Error al registrar venta a deudor.");
    } finally {
      setBusy(false);
    }
  }

  // Move active sale to Pending (Poner en espera)
  function handleMoveToPending() {
    if (activeTab.lines.length === 0 || totals.totalCents <= 0) {
      toast.error("No hay ítems para poner en espera.");
      return;
    }

    const debtor = debtors.find((d) => d.id === activeTab.debtorId);
    const newPending: PendingSale = {
      id: crypto.randomUUID(),
      lines: [...activeTab.lines],
      totalCents: totals.totalCents,
      timeStr: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      paymentMethod: activeTab.paymentMethod,
      debtorId: activeTab.debtorId || undefined,
      debtorName: debtor?.name,
    };

    setPendingSales((prev) => [newPending, ...prev]);
    clearActiveTab();
    toast.info("Venta puesta en espera en Pendientes de Pago.");
  }

  // Restore pending sale into active tab
  function handleRestorePending(pending: PendingSale) {
    if (activeTab.lines.length > 0) {
      // Look for an empty tab or create one
      const emptyTab = tabs.find((t) => t.lines.length === 0);
      if (emptyTab) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === emptyTab.id
              ? {
                  ...t,
                  lines: pending.lines,
                  paymentMethod: pending.paymentMethod,
                  debtorId: pending.debtorId || "",
                  saleKey: newKey(),
                }
              : t,
          ),
        );
        setActiveTabId(emptyTab.id);
      } else {
        const newTabId = `tab-${Date.now()}`;
        setTabs((prev) => [
          ...prev,
          {
            id: newTabId,
            label: `Pedido ${prev.length + 1}`,
            lines: pending.lines,
            paymentMethod: pending.paymentMethod,
            debtorId: pending.debtorId || "",
            discount: "",
            saleKey: newKey(),
          },
        ]);
        setActiveTabId(newTabId);
      }
    } else {
      updateActiveTab({
        lines: pending.lines,
        paymentMethod: pending.paymentMethod,
        debtorId: pending.debtorId || "",
        saleKey: newKey(),
      });
    }

    // Remove from pending
    setPendingSales((prev) => prev.filter((p) => p.id !== pending.id));
    toast.success("Pedido recuperado al carrito.");
  }

  // Discard pending sale
  function handleDiscardPending(id: string) {
    setPendingSales((prev) => prev.filter((p) => p.id !== id));
    toast.info("Pedido pendiente eliminado.");
  }

  // Split payment confirm
  async function handleConfirmSplit() {
    const cashVal = parseFloat(splitCash) || 0;
    const transVal = parseFloat(splitTransfer) || 0;
    const posVal = parseFloat(splitPosnet) || 0;

    const cashCents = Math.round(cashVal * 100);
    const transCents = Math.round(transVal * 100);
    const posCents = Math.round(posVal * 100);

    const totalEntered = cashCents + transCents + posCents;
    if (totalEntered < totals.totalCents) {
      toast.error(`Faltan ${money(totals.totalCents - totalEntered)} para cubrir el total.`);
      return;
    }

    const payments: { method: "CASH" | "CARD" | "TRANSFER" | "OTHER"; amountCents: number }[] = [];
    if (cashCents > 0) payments.push({ method: "CASH", amountCents: cashCents });
    if (transCents > 0) payments.push({ method: "TRANSFER", amountCents: transCents });
    if (posCents > 0) payments.push({ method: "CARD", amountCents: posCents });

    setBusy(true);
    try {
      const result = await createSale({
        idempotencyKey: activeTab.saleKey,
        items: activeTab.lines.map((l) => ({ productId: l.id, quantity: l.quantity })),
        payments,
        discountCents: totals.discountCents,
        expectedTotalCents: totals.totalCents,
        note: "Pago dividido / mixto",
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Venta dividida registrada.");
      setDoneSale({
        id: result.data?.id ?? "",
        number: result.data?.number ?? "",
        totalCents: totals.totalCents,
        changeCents: Math.max(0, totalEntered - totals.totalCents),
        methodLabel: "Pago Dividido",
      });

      setShowSplitModal(false);
      clearActiveTab();
    } catch {
      toast.error("Error al procesar el pago.");
    } finally {
      setBusy(false);
    }
  }

  function handleAddNewTab() {
    if (tabs.length >= 6) {
      toast.error("Límite de 6 pedidos abiertos alcanzado.");
      return;
    }
    const newTabId = `tab-${Date.now()}`;
    const newTabLabel = `Pedido ${tabs.length + 1}`;
    setTabs((prev) => [
      ...prev,
      {
        id: newTabId,
        label: newTabLabel,
        lines: [],
        paymentMethod: "CASH",
        debtorId: "",
        discount: "",
        saleKey: newKey(),
      },
    ]);
    setActiveTabId(newTabId);
  }

  function handleCloseTab(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Barra de Pestañas de Pedidos (Multi-Ticket) */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 px-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5">
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTabId;
            const count = tab.lines.reduce((acc, l) => acc + l.quantity, 0);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition select-none ${
                  isActive
                    ? "bg-rose-500/20 text-rose-300 border-b-2 border-rose-400 font-bold shadow-sm"
                    : "bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className="bg-rose-500/30 text-rose-200 text-xs px-1.5 py-0.5 rounded-full font-mono">
                    {count}
                  </span>
                )}
                {tabs.length > 1 && tab.lines.length === 0 && (
                  <span
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="text-slate-500 hover:text-rose-400 ml-1 text-xs"
                    title="Cerrar pestaña"
                  >
                    ✕
                  </span>
                )}
              </button>
            );
          })}

          {tabs.length < 6 && (
            <button
              type="button"
              onClick={handleAddNewTab}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-dashed border-white/10 transition"
              title="Abrir nuevo pedido simultáneo"
            >
              + Nuevo Pedido
            </button>
          )}
        </div>

        {pendingSales.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
            <span>⏸️ {pendingSales.length} en espera</span>
          </div>
        )}
      </div>

      {/* 2. Cuadrícula Principal del POS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUMNA 1: Buscar & Catálogo de Productos (Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`${ui.card} p-4 space-y-3`}>
            <p className={ui.label}>Buscar y Agregar Producto</p>
            <div className="space-y-2">
              <input
                ref={searchBox}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddClick();
                  }
                }}
                autoFocus
                placeholder="Nombre, código de barra o SKU..."
                className={ui.input}
              />

              <div className="flex gap-2">
                <div className="w-1/3">
                  <input
                    type="number"
                    min="1"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    className={`${ui.input} text-center font-bold`}
                    placeholder="Cant."
                    title="Cantidad a agregar"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddClick}
                  className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm active:scale-95"
                >
                  + Agregar al Pedido
                </button>
              </div>
            </div>

            {/* Listado rápido de productos encontrados */}
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 pt-1">
              {results.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2 text-center">
                  {query ? "No se encontraron productos coincidentes." : "Escribí o escaneá para ver productos."}
                </p>
              ) : (
                results.map((p) => {
                  const isOut = p.trackStock && p.stock <= 0 && !allowNegativeStock;
                  const isSelected = selectedProductId === p.id;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProductId(p.id);
                        addProductToCart(p, Math.max(1, parseInt(quantityInput, 10) || 1));
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                        isSelected
                          ? "border-rose-400/80 bg-rose-400/[0.08]"
                          : "border-white/5 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.04]"
                      } ${isOut ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-white font-medium truncate">{p.name}</p>
                        <p className="text-slate-500 font-mono text-[10px] truncate">{p.sku}</p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-rose-300 font-bold block">{money(p.priceCents)}</span>
                        {p.trackStock && (
                          <span className={`text-[10px] ${isOut ? "text-rose-500 font-bold" : "text-slate-500"}`}>
                            {isOut ? "Sin stock" : `${p.stock} disp.`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA 2: Pedido Actual (Lista de Ítems) (Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`${ui.card} p-4 space-y-3`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeTab.label}</span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({activeTab.lines.length} {activeTab.lines.length === 1 ? "ítem" : "ítems"})
                  </span>
                </p>
              </div>

              {activeTab.lines.length > 0 && (
                <button
                  type="button"
                  onClick={clearActiveTab}
                  className="text-xs text-rose-400/80 hover:text-rose-400 underline transition"
                >
                  Vaciar pedido
                </button>
              )}
            </div>

            {activeTab.lines.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <p className="text-slate-500 text-sm italic">Pedido vacío</p>
                <p className="text-xs text-slate-600">
                  Agregá productos desde la columna izquierda o escaneá un código de barra.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5 max-h-[500px] overflow-y-auto pr-1 space-y-1">
                {activeTab.lines.map((item, idx) => (
                  <li key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">
                        <span className="text-slate-500 font-mono mr-1">{idx + 1}.</span>
                        {item.name}
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {money(item.priceCents)} c/u
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => adjustLineQty(item.id, -1)}
                          className="size-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-white/10 font-bold transition"
                          title="Restar 1"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-bold text-white font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustLineQty(item.id, 1)}
                          className="size-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-white/10 font-bold transition"
                          title="Sumar 1"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-white font-bold w-16 text-right">
                        {money(item.priceCents * item.quantity)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeLine(item.id)}
                        className="text-slate-600 hover:text-rose-400 p-1 transition leading-none text-sm"
                        title="Eliminar del pedido"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* COLUMNA 3: Totales, Métodos de Pago y Acciones (Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`${ui.card} p-5 space-y-5 border-rose-500/30 bg-rose-500/[0.02]`}>
            {/* Total Grande */}
            <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">TOTAL A COBRAR</p>
                <p className="text-4xl font-extrabold text-emerald-400 tracking-tight mt-1">
                  {money(totals.totalCents)}
                </p>
              </div>

              {canDiscount && (
                <div className="w-24 text-right">
                  <input
                    value={activeTab.discount}
                    onChange={(e) => updateActiveTab({ discount: e.target.value })}
                    placeholder="Desc. $"
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white text-right outline-none focus:border-rose-400"
                    title="Descuento en pesos"
                  />
                </div>
              )}
            </div>

            {/* Selector de Método de Pago Directo estilo MariERP */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 text-center uppercase tracking-wider">
                Método de Pago
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "CASH" as const, label: "Efectivo", icon: "💵" },
                  { id: "TRANSFER" as const, label: "Transf.", icon: "📲" },
                  { id: "CARD" as const, label: "Posnet", icon: "💳" },
                ].map((m) => {
                  const isSelected = activeTab.paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateActiveTab({ paymentMethod: m.id })}
                      className={`py-3 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 select-none border ${
                        isSelected
                          ? "bg-rose-500/20 text-rose-300 border-rose-400 shadow-md ring-1 ring-rose-400/50"
                          : "bg-white/5 text-slate-300 border-white/10 hover:border-white/20 hover:bg-white/[0.08]"
                      }`}
                    >
                      <span className="text-base">{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botones Principales de Cobro */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={activeTab.lines.length === 0 || busy}
                onClick={() => handleQuickCharge()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold py-3.5 px-4 rounded-xl text-base transition shadow-lg shadow-emerald-950/40 active:scale-98 flex items-center justify-center gap-2"
              >
                <span>Cobrar</span>
                <span>{money(totals.totalCents)}</span>
                <span className="text-xs bg-emerald-700/60 px-2 py-0.5 rounded-full font-normal">
                  {activeTab.paymentMethod === "CASH"
                    ? "Efectivo"
                    : activeTab.paymentMethod === "TRANSFER"
                    ? "Transf."
                    : "Posnet"}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={activeTab.lines.length === 0}
                  onClick={() => {
                    setSplitCash(centsToInput(totals.totalCents));
                    setSplitTransfer("");
                    setSplitPosnet("");
                    setShowSplitModal(true);
                  }}
                  className="py-2 px-3 rounded-lg text-xs font-semibold text-slate-300 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition text-center"
                >
                  Dividir Pago
                </button>

                <button
                  type="button"
                  disabled={activeTab.lines.length === 0}
                  onClick={handleMoveToPending}
                  className="py-2 px-3 rounded-lg text-xs font-semibold text-amber-300 border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 transition text-center"
                  title="Poner venta en espera para atender a otro cliente"
                >
                  ⏸️ Pendiente
                </button>
              </div>
            </div>

            {/* Sección: Enviar a Deudor (Fiado) */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <label className="block text-xs font-semibold text-purple-300">
                Enviar a Cuenta Deudor (Fiado)
              </label>

              <select
                value={activeTab.debtorId}
                onChange={(e) => updateActiveTab({ debtorId: e.target.value })}
                className={`${ui.input} text-xs`}
              >
                <option value="">Seleccionar cliente deudor...</option>
                {debtors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.saldoFavorCents > 0 ? `(Favor: ${money(d.saldoFavorCents)})` : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!activeTab.debtorId || activeTab.lines.length === 0 || busy}
                onClick={handleSendToDebtor}
                className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow-md active:scale-98"
              >
                👤 Enviar a Deudor
              </button>
            </div>
          </div>

          {/* Sección Lateral: Pendientes de Pago */}
          {pendingSales.length > 0 && (
            <div className={`${ui.card} p-4 space-y-3 border-amber-500/30 bg-amber-500/[0.02]`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⏸️ Pendientes de Pago ({pendingSales.length})</span>
                </p>
              </div>

              <ul className="divide-y divide-white/5 space-y-2 max-h-60 overflow-y-auto pr-1">
                {pendingSales.map((p) => (
                  <li key={p.id} className="pt-2 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-white font-bold block">{money(p.totalCents)}</span>
                      <span className="text-slate-400 text-[10px]">
                        {p.timeStr} · {p.lines.length} {p.lines.length === 1 ? "ítem" : "ítems"}
                        {p.debtorName ? ` · ${p.debtorName}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestorePending(p)}
                        className="px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30 rounded-lg text-xs font-bold transition"
                      >
                        Recuperar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscardPending(p.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Descartar"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modal de Dividir Pago (Split Payment) */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`${ui.card} max-w-md w-full p-6 space-y-5 border-rose-500/40 shadow-2xl`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <p className="text-lg font-bold text-white">Dividir Pago de la Venta</p>
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex items-baseline justify-between bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-xs text-slate-300">Total a Cubrir:</span>
              <span className="text-2xl font-black text-emerald-400">{money(totals.totalCents)}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  💵 Efectivo ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  placeholder="0"
                  className={ui.input}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  📲 Transferencia ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={splitTransfer}
                  onChange={(e) => setSplitTransfer(e.target.value)}
                  placeholder="0"
                  className={ui.input}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  💳 Posnet / Tarjeta ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={splitPosnet}
                  onChange={(e) => setSplitPosnet(e.target.value)}
                  placeholder="0"
                  className={ui.input}
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className={`${ui.ghost} flex-1`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmSplit}
                className={`${ui.button} flex-1`}
              >
                Confirmar Cobro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal / Notificación de Venta Registrada con Éxito */}
      {doneSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`${ui.card} max-w-sm w-full p-6 text-center space-y-6 border-emerald-500/40 shadow-2xl`}>
            <div className="size-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-slate-400">Venta Registrada</p>
              <p className="text-3xl font-extrabold text-white">Ticket #{doneSale.number}</p>
              <p className="text-xl font-bold text-emerald-400">{money(doneSale.totalCents)}</p>
              <p className="text-xs text-slate-400">{doneSale.methodLabel}</p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDoneSale(null)}
                className={`${ui.button} w-full text-base py-3`}
              >
                Siguiente Venta
              </button>

              {doneSale.id && (
                <Link
                  href={`/pos/receipt/${doneSale.id}`}
                  target="_blank"
                  className={`${ui.ghost} w-full text-xs text-center block`}
                >
                  Ver / Imprimir Recibo
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
