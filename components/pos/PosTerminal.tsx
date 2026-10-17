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
  const [splitDebtorId, setSplitDebtorId] = useState("");
  const [splitDebtorAmount, setSplitDebtorAmount] = useState("");

  const searchBox = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  // Load state from localStorage on initial client mount
  useEffect(() => {
    try {
      const savedTabs = localStorage.getItem(STORAGE_KEY_TABS);
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const initial3 = ["tab-1", "tab-2", "tab-3"].map((id, index) => {
            const existing = parsed.find((p) => p.id === id) || parsed[index];
            return {
              id,
              label: `Pedido ${index + 1}`,
              lines: existing?.lines || [],
              paymentMethod: existing?.paymentMethod || "CASH",
              debtorId: existing?.debtorId || "",
              discount: existing?.discount || "",
              saleKey: existing?.saleKey || newKey(),
            };
          });
          setTabs(initial3);
          setActiveTabId("tab-1");
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
    activeTab.lines.map((l) => ({
      unitPriceCents: l.priceCents,
      quantity: l.quantity,
      taxRateBp: 0,
      saleType: l.saleType,
    })),
    discountCents ?? 0,
  );

  function parseQuantity(raw: string, isWeight = false): number {
    const cleaned = raw.replace(",", ".").trim();
    const val = parseFloat(cleaned);
    if (isNaN(val) || val <= 0) return isWeight ? 100 : 1;
    if (isWeight) {
      // 100 son 100 gramos, 1000 es 1 kilo (1000 gramos).
      // Si el usuario ingresa valores como 1, 2, o 1.5 kilos: convertir a gramos
      if (val < 10) {
        return Math.round(val * 1000);
      }
      return Math.round(val);
    }
    return Math.round(val * 1000) / 1000;
  }

  function addProductToCart(product: TillProduct, qty?: number) {
    const isWeight = product.saleType === "WEIGHT";
    const finalQty = qty !== undefined ? qty : isWeight ? 100 : 1;
    if (finalQty <= 0) return;

    const current = activeTab.lines.find((l) => l.id === product.id)?.quantity ?? 0;
    if (product.trackStock && !allowNegativeStock) {
      const stockGrams = isWeight ? product.stock * 1000 : product.stock;
      if (current + finalQty > stockGrams) {
        toast.error(`Solo quedan ${product.stock} de "${product.name}" en stock.`);
        return;
      }
    }

    const updatedLines = [...activeTab.lines];
    const existingIndex = updatedLines.findIndex((l) => l.id === product.id);
    if (existingIndex >= 0) {
      const newTotalQty = Math.round(updatedLines[existingIndex].quantity + finalQty);
      updatedLines[existingIndex] = {
        ...updatedLines[existingIndex],
        quantity: newTotalQty,
      };
    } else {
      updatedLines.push({ ...product, quantity: finalQty });
    }

    updateActiveTab({ lines: updatedLines, saleKey: newKey() });
    const formattedQty = isWeight ? `${finalQty}gr` : `${finalQty}u.`;
    toast.success(`+${formattedQty} ${product.name}`);
  }

  function adjustLineQty(lineId: string, direction: number) {
    const line = activeTab.lines.find((l) => l.id === lineId);
    if (!line) return;
    const isWeight = line.saleType === "WEIGHT";
    // For weight products: step is 100gr (or 50gr if current is <= 100gr)
    const step = isWeight ? (line.quantity <= 100 ? 50 : 100) : 1;
    const newQty = Math.round(line.quantity + direction * step);
    if (newQty <= 0) {
      removeLine(lineId);
      return;
    }
    if (line.trackStock && !allowNegativeStock) {
      const stockGrams = isWeight ? line.stock * 1000 : line.stock;
      if (newQty > stockGrams) {
        toast.error(`Stock máximo alcanzado (${line.stock}).`);
        return;
      }
    }
    const updatedLines = activeTab.lines.map((l) =>
      l.id === lineId ? { ...l, quantity: newQty } : l,
    );
    updateActiveTab({ lines: updatedLines, saleKey: newKey() });
  }

  function setLineExactQty(lineId: string, rawVal: string) {
    const line = activeTab.lines.find((l) => l.id === lineId);
    if (!line) return;
    const isWeight = line.saleType === "WEIGHT";
    const val = parseQuantity(rawVal, isWeight);
    if (line.trackStock && !allowNegativeStock) {
      const stockGrams = isWeight ? line.stock * 1000 : line.stock;
      if (val > stockGrams) {
        toast.error(`Stock máximo alcanzado (${line.stock}).`);
        return;
      }
    }
    const updatedLines = activeTab.lines.map((l) =>
      l.id === lineId ? { ...l, quantity: val } : l,
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
    let targetProd = selectedProductId ? results.find((r) => r.id === selectedProductId) : null;
    const term = query.trim();

    if (!targetProd && term) {
      const exact = await findProductByCode(term).catch(() => null);
      targetProd = exact ?? (results.length > 0 ? results[0] : null);
    }

    if (!targetProd) {
      toast.error("Producto no encontrado.");
      return;
    }

    const isWeight = targetProd.saleType === "WEIGHT";
    const qty = isWeight && quantityInput === "1" ? 100 : parseQuantity(quantityInput, isWeight);
    addProductToCart(targetProd, qty);
    setQuery("");
    setQuantityInput("1");
    if (searchBox.current) searchBox.current.focus();
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
    const targetTab =
      (activeTab.lines.length === 0 ? activeTab : null) ||
      tabs.find((t) => t.lines.length === 0) ||
      activeTab;

    setTabs((prev) =>
      prev.map((t) =>
        t.id === targetTab.id
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
    setActiveTabId(targetTab.id);
    setPendingSales((prev) => prev.filter((p) => p.id !== pending.id));
    toast.success(`Pedido recuperado en ${targetTab.label}.`);
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
    const debtorVal = parseFloat(splitDebtorAmount) || 0;

    const cashCents = Math.round(cashVal * 100);
    const transCents = Math.round(transVal * 100);
    const posCents = Math.round(posVal * 100);
    const debtorCents = Math.round(debtorVal * 100);

    if (debtorCents > 0 && !splitDebtorId) {
      toast.error("Por favor seleccioná el cliente deudor para asignarle el saldo fiado.");
      return;
    }

    const totalEntered = cashCents + transCents + posCents + debtorCents;
    if (totalEntered < totals.totalCents) {
      toast.error(`Faltan ${money(totals.totalCents - totalEntered)} para cubrir el total.`);
      return;
    }

    const payments: { method: "CASH" | "CARD" | "TRANSFER" | "OTHER"; amountCents: number }[] = [];
    if (cashCents > 0) payments.push({ method: "CASH", amountCents: cashCents });
    if (transCents > 0) payments.push({ method: "TRANSFER", amountCents: transCents });
    if (posCents > 0) payments.push({ method: "CARD", amountCents: posCents });
    if (debtorCents > 0) payments.push({ method: "OTHER", amountCents: debtorCents });

    const selectedDebtor = debtors.find((d) => d.id === splitDebtorId);

    setBusy(true);
    try {
      const result = await createSale({
        idempotencyKey: activeTab.saleKey,
        items: activeTab.lines.map((l) => ({ productId: l.id, quantity: l.quantity })),
        payments,
        discountCents: totals.discountCents,
        expectedTotalCents: totals.totalCents,
        debtorId: debtorCents > 0 ? splitDebtorId : undefined,
        debtorAmountCents: debtorCents > 0 ? debtorCents : undefined,
        note:
          debtorCents > 0
            ? `Pago dividido (Fiado a ${selectedDebtor?.name || "cliente"}: ${money(debtorCents)})`
            : "Pago dividido / mixto",
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.message ??
          (debtorCents > 0
            ? `Venta registrada. ${money(debtorCents)} enviados a la cuenta de ${selectedDebtor?.name || "cliente"}.`
            : "Venta dividida registrada.")
      );
      setDoneSale({
        id: result.data?.id ?? "",
        number: result.data?.number ?? "",
        totalCents: totals.totalCents,
        changeCents: Math.max(0, totalEntered - totals.totalCents),
        methodLabel:
          debtorCents > 0
            ? `Pago Dividido (${selectedDebtor?.name ? `Fiado: ${selectedDebtor.name}` : "Fiado"})`
            : "Pago Dividido",
      });

      setShowSplitModal(false);
      clearActiveTab();
    } catch {
      toast.error("Error al procesar el pago.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Barra de Pestañas de Pedidos (3 Pedidos Fijos) */}
      <div className="flex items-center justify-between border-b border-[#EAE9F6] pb-4 overflow-x-auto gap-4">
        <div className="flex items-center gap-2.5">
          {tabs.slice(0, 3).map((tab) => {
            const isActive = tab.id === activeTabId;
            const countDisplay = tab.lines.length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.15em] font-bold transition-all duration-200 select-none border ${
                  isActive
                    ? "bg-gradient-to-r from-[#6852F6] to-[#5538EA] text-white border-transparent shadow-[0_10px_24px_rgba(85,56,234,0.35)] -translate-y-0.5 active:scale-95 cursor-pointer"
                    : "bg-white text-[#72729A] hover:text-[#18182E] hover:bg-[#F8F9FE] border-[#EAE9F6] shadow-xs hover:shadow-sm cursor-pointer"
                }`}
              >
                <span>{tab.label}</span>
                {countDisplay > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black ${
                      isActive ? "bg-white/25 text-white" : "bg-[#5E48E8]/10 text-[#5E48E8]"
                    }`}
                  >
                    {countDisplay}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {pendingSales.length > 0 && (
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-600 font-bold px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 shadow-xs">
            <span>⏸️ {pendingSales.length} en espera</span>
          </div>
        )}
      </div>

      {/* 2. Cuadrícula Principal del POS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUMNA 1: Buscar & Catálogo de Productos (Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="clay-card p-5 space-y-4">
            <p className={ui.label}>Buscar y Agregar Producto</p>
            <div className="space-y-3">
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
                className="w-full bg-[#F8F9FE] border border-[#EAE9F6] focus:border-[#5E48E8] focus:bg-white focus:ring-2 focus:ring-[#5E48E8]/10 rounded-full px-5 py-3 text-sm text-[#18182E] placeholder:text-[#72729A] outline-none transition-all"
              />

              <div className="flex items-center gap-2">
                <div className="w-28 shrink-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddClick();
                      }
                    }}
                    className="w-full bg-[#F8F9FE] border border-[#EAE9F6] focus:border-[#5E48E8] focus:bg-white rounded-full py-2.5 px-3 text-center font-bold font-mono text-sm text-[#18182E] outline-none transition placeholder:text-[#72729A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Cant / gr"
                    title="Cantidad o gramos (ej: 100, 250, 500, 1000)"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddClick}
                  className="flex-1 py-2.5 px-5 bg-gradient-to-r from-[#6852F6] to-[#5538EA] hover:-translate-y-0.5 active:scale-95 text-white font-bold rounded-full transition-all text-xs uppercase tracking-wider shadow-[0_8px_20px_rgba(85,56,234,0.32)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>+ Agregar al Pedido</span>
                </button>
              </div>
            </div>

            {/* Listado rápido de productos encontrados */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 pt-1">
              {results.length === 0 ? (
                <p className="text-xs text-[#72729A] italic py-8 text-center">
                  {query ? "No se encontraron productos coincidentes." : "Escribí o escaneá para ver productos."}
                </p>
              ) : (
                results.map((p) => {
                  const isOut = p.trackStock && p.stock <= 0 && !allowNegativeStock;
                  const isSelected = selectedProductId === p.id;
                  const isWeight = p.saleType === "WEIGHT";

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProductId(p.id);
                        const qty = isWeight && quantityInput === "1" ? 100 : parseQuantity(quantityInput, isWeight);
                        addProductToCart(p, qty);
                      }}
                      className={`group flex items-center justify-between p-3.5 rounded-2xl border text-xs cursor-pointer transition-all select-none ${
                        isSelected
                          ? "border-[#5E48E8] bg-[#F4F3FF] shadow-sm ring-2 ring-[#5E48E8]/20"
                          : "border-[#EAE9F6] hover:border-[#5E48E8]/40 bg-white hover:bg-[#F8F9FE] shadow-xs hover:shadow-sm hover:-translate-y-0.5"
                      } ${isOut ? "opacity-40 cursor-not-allowed" : "active:scale-[0.99]"}`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[#18182E] font-bold group-hover:text-[#5E48E8] transition truncate">
                            {p.name}
                          </p>
                          {isWeight && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#5E48E8]/10 text-[#5E48E8] rounded-full font-bold border border-[#5E48E8]/20">
                              ⚖️ x Kilo
                            </span>
                          )}
                          {p.size && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#EEF0FA] text-[#72729A] rounded-full font-mono">
                              {p.size}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-[#5E48E8] font-extrabold font-mono block text-sm">
                          {money(p.priceCents)}{isWeight ? <span className="text-[10px] font-normal text-[#72729A]">/kg</span> : ""}
                        </span>
                        {p.trackStock && (
                          <span className={`text-[10px] font-mono ${isOut ? "text-rose-500 font-bold" : "text-[#72729A]"}`}>
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
          <div className="clay-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE9F6] pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] font-bold text-[#18182E] flex items-center gap-2">
                  <span>{activeTab.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5E48E8]/10 text-[#5E48E8] font-mono font-bold">
                    {activeTab.lines.length} {activeTab.lines.length === 1 ? "ítem" : "ítems"}
                  </span>
                </p>
              </div>

              {activeTab.lines.length > 0 && (
                <button
                  type="button"
                  onClick={clearActiveTab}
                  className="text-xs uppercase tracking-wider text-[#72729A] hover:text-rose-500 transition font-semibold cursor-pointer"
                >
                  Vaciar
                </button>
              )}
            </div>

            {activeTab.lines.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <div className="size-14 rounded-3xl bg-[#EEF0FA] flex items-center justify-center mx-auto text-2xl text-[#72729A] shadow-inner-xs">
                  🛒
                </div>
                <p className="text-[#18182E] text-xs uppercase tracking-wider font-bold">Pedido vacío</p>
                <p className="text-xs text-[#72729A]">
                  Agregá productos del catálogo o escaneá un código
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#EAE9F6] max-h-[460px] overflow-y-auto pr-1">
                {activeTab.lines.map((item, idx) => {
                  const isWeight = item.saleType === "WEIGHT";
                  const lineTotal = Math.round(
                    isWeight
                      ? (item.priceCents * item.quantity) / 1000
                      : item.priceCents * item.quantity,
                  );

                  return (
                    <li key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[#18182E] font-bold truncate">
                            <span className="text-[#72729A] font-mono mr-1">{idx + 1}.</span>
                            {item.name}
                          </p>
                          {isWeight && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-[#5E48E8]/10 text-[#5E48E8] rounded-full font-bold border border-[#5E48E8]/20">
                              ⚖️ x Kilo
                            </span>
                          )}
                          {item.size && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-[#EEF0FA] text-[#72729A] rounded-full font-mono">
                              {item.size}
                            </span>
                          )}
                        </div>
                        <p className="text-[#72729A] text-[11px] mt-0.5 font-mono">
                          {money(item.priceCents)} {isWeight ? "/kg" : "c/u"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center bg-[#F8F9FE] border border-[#EAE9F6] rounded-full p-0.5">
                          <button
                            type="button"
                            onClick={() => adjustLineQty(item.id, -1)}
                            className="size-7 flex items-center justify-center text-[#72729A] hover:text-[#5E48E8] hover:bg-white rounded-full font-bold transition active:scale-90 cursor-pointer"
                            title={isWeight ? "Restar 100gr" : "Restar 1"}
                          >
                            −
                          </button>
                          <div className="flex items-center px-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              defaultValue={item.quantity}
                              key={`${item.id}-${item.quantity}`}
                              onBlur={(e) => setLineExactQty(item.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-14 text-center font-extrabold text-[#18182E] font-mono bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-[#5E48E8] rounded-full py-0.5 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title="Escribí los gramos con el teclado (ej: 100, 250, 500, 1000) y pulsá Enter"
                            />
                            <span className="text-[10px] text-[#72729A] font-mono ml-0.5">
                              {isWeight ? "gr" : "u"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => adjustLineQty(item.id, 1)}
                            className="size-7 flex items-center justify-center text-[#72729A] hover:text-[#5E48E8] hover:bg-white rounded-full font-bold transition active:scale-90 cursor-pointer"
                            title={isWeight ? "Sumar 100gr" : "Sumar 1"}
                          >
                            +
                          </button>
                        </div>

                        <span className="text-[#18182E] font-black w-16 text-right font-mono text-sm">
                          {money(lineTotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeLine(item.id)}
                          className="size-6 flex items-center justify-center text-[#72729A] hover:text-rose-500 hover:bg-rose-50 rounded-full transition text-xs cursor-pointer"
                          title="Eliminar del pedido"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* COLUMNA 3: Totales, Métodos de Pago y Acciones (Span 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="clay-card p-6 space-y-6 relative overflow-hidden">
            {/* Total Grande */}
            <div className="flex items-baseline justify-between border-b border-[#EAE9F6] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#72729A]">Total a Cobrar</p>
                <p className="text-4xl sm:text-5xl font-black text-[#18182E] tracking-tight font-mono mt-1">
                  {money(totals.totalCents)}
                </p>
              </div>

              {canDiscount && (
                <div className="w-24 text-right">
                  <input
                    value={activeTab.discount}
                    onChange={(e) => updateActiveTab({ discount: e.target.value })}
                    placeholder="Desc. $"
                    className="w-full bg-[#F8F9FE] border border-[#EAE9F6] rounded-xl focus:border-[#5E48E8] text-xs text-[#18182E] text-right outline-none py-1.5 px-2 placeholder:text-[#72729A] font-mono transition"
                    title="Descuento en pesos"
                  />
                </div>
              )}
            </div>

            {/* Selector de Método de Pago Directo */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#72729A]">Método de Pago</p>

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
                      className={`py-3 px-2 rounded-2xl text-xs uppercase tracking-wider font-bold transition-all flex flex-col items-center justify-center gap-1.5 select-none border cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-[#6852F6] to-[#5538EA] text-white border-transparent shadow-[0_8px_20px_rgba(85,56,234,0.3)] -translate-y-0.5"
                          : "bg-white text-[#72729A] border-[#EAE9F6] hover:text-[#18182E] hover:bg-[#F8F9FE] shadow-xs"
                      }`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botones Principales de Cobro */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                disabled={activeTab.lines.length === 0 || busy}
                onClick={() => handleQuickCharge()}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#6852F6] to-[#5538EA] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 disabled:hover:translate-y-0 text-white font-extrabold text-sm uppercase tracking-[0.15em] rounded-full transition-all shadow-[0_12px_28px_rgba(85,56,234,0.35)] flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>Cobrar</span>
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/20">
                    {activeTab.paymentMethod === "CASH"
                      ? "Efectivo"
                      : activeTab.paymentMethod === "TRANSFER"
                      ? "Transf."
                      : "Posnet"}
                  </span>
                </span>
                <span className="font-mono text-base font-black">
                  {money(totals.totalCents)}
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
                    setSplitDebtorId(activeTab.debtorId || "");
                    setSplitDebtorAmount("");
                    setShowSplitModal(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-full text-xs uppercase tracking-wider font-bold bg-white text-[#18182E] border border-[#EAE9F6] hover:bg-[#F8F9FE] shadow-xs hover:shadow-sm transition cursor-pointer text-center truncate disabled:opacity-40"
                >
                  Dividir Pago
                </button>

                <button
                  type="button"
                  disabled={activeTab.lines.length === 0}
                  onClick={handleMoveToPending}
                  className="w-full py-2.5 px-3 border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 rounded-full transition text-xs uppercase tracking-wider text-amber-800 font-bold active:scale-95 shadow-xs text-center truncate cursor-pointer"
                  title="Poner venta en espera para atender a otro cliente"
                >
                  ⏸️ En Espera
                </button>
              </div>
            </div>

            {/* Sección: Enviar a Deudor (Fiado) */}
            <div className="pt-4 border-t border-[#EAE9F6] space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#72729A]">A Cuenta de Deudor (Fiado)</p>

              <select
                value={activeTab.debtorId}
                onChange={(e) => updateActiveTab({ debtorId: e.target.value })}
                className="w-full bg-[#F8F9FE] border border-[#EAE9F6] focus:border-[#5E48E8] rounded-2xl px-3.5 py-2.5 text-xs text-[#18182E] outline-none transition"
              >
                <option value="" className="text-[#72729A]">Seleccionar cliente deudor...</option>
                {debtors.map((d) => (
                  <option key={d.id} value={d.id} className="text-[#18182E]">
                    {d.name} {d.saldoFavorCents > 0 ? `(Favor: ${money(d.saldoFavorCents)})` : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!activeTab.debtorId || activeTab.lines.length === 0 || busy}
                onClick={handleSendToDebtor}
                className="w-full py-2.5 px-3 rounded-full text-xs uppercase tracking-wider font-bold bg-white text-[#72729A] border border-[#EAE9F6] hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 shadow-xs transition cursor-pointer disabled:opacity-40"
              >
                📒 Enviar al Fiado
              </button>
            </div>
          </div>

          {/* Sección Lateral: Pendientes de Pago */}
          {pendingSales.length > 0 && (
            <div className="clay-card p-5 space-y-3 border-amber-200 bg-amber-50/50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⏸️ Pendientes de Pago ({pendingSales.length})</span>
                </p>
              </div>

              <ul className="divide-y divide-amber-200/50 space-y-2 max-h-60 overflow-y-auto pr-1">
                {pendingSales.map((p) => (
                  <li key={p.id} className="pt-2 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[#18182E] font-bold block">{money(p.totalCents)}</span>
                      <span className="text-[#72729A] text-[10px]">
                        {p.timeStr} · {p.lines.length} {p.lines.length === 1 ? "ítem" : "ítems"}
                        {p.debtorName ? ` · ${p.debtorName}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestorePending(p)}
                        className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        Recuperar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscardPending(p.id)}
                        className="text-[#72729A] hover:text-rose-500 p-1 cursor-pointer"
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
      {showSplitModal && (() => {
        const splitCashCents = Math.round((parseFloat(splitCash) || 0) * 100);
        const splitTransCents = Math.round((parseFloat(splitTransfer) || 0) * 100);
        const splitPosCents = Math.round((parseFloat(splitPosnet) || 0) * 100);
        const splitDebtorCents = Math.round((parseFloat(splitDebtorAmount) || 0) * 100);

        const totalEnteredCents = splitCashCents + splitTransCents + splitPosCents + splitDebtorCents;
        const remainingCents = totals.totalCents - totalEnteredCents;
        const nonDebtorCents = splitCashCents + splitTransCents + splitPosCents;
        const remainderForDebtor = Math.max(0, totals.totalCents - nonDebtorCents);
        const isCovered = totalEnteredCents >= totals.totalCents;
        const debtorMissing = splitDebtorCents > 0 && !splitDebtorId;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18182E]/40 backdrop-blur-md animate-in fade-in duration-200">
            <div className="clay-card max-w-lg w-full p-6 sm:p-7 space-y-5 rounded-3xl border border-[#EAE9F6] shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#EAE9F6] pb-3">
                <p className="text-base font-extrabold text-[#18182E] uppercase tracking-wider flex items-center gap-2">
                  <span>⚡</span> Dividir Pago de la Venta
                </p>
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  className="text-[#72729A] hover:text-[#18182E] text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-baseline justify-between bg-[#F8F9FE] p-4 rounded-2xl border border-[#EAE9F6]">
                <span className={ui.label}>Total a Cubrir</span>
                <span className="text-2xl font-black text-[#5E48E8] font-mono">{money(totals.totalCents)}</span>
              </div>

              <div className="space-y-4">
                {/* 💵 Efectivo */}
                <div>
                  <label className={ui.label}>💵 Efectivo ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    placeholder="0"
                    className={ui.input}
                  />
                </div>

                {/* 📲 Transferencia */}
                <div>
                  <label className={ui.label}>📲 Transferencia / MP ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={splitTransfer}
                    onChange={(e) => setSplitTransfer(e.target.value)}
                    placeholder="0"
                    className={ui.input}
                  />
                </div>

                {/* 💳 Posnet */}
                <div>
                  <label className={ui.label}>💳 Posnet / Tarjeta ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={splitPosnet}
                    onChange={(e) => setSplitPosnet(e.target.value)}
                    placeholder="0"
                    className={ui.input}
                  />
                </div>

                {/* 📒 Enviar a Fiado / Deudor */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <span>📒</span> Enviar al Fiado / Deudor
                    </label>
                    {remainderForDebtor > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSplitDebtorAmount(String(remainderForDebtor / 100))
                        }
                        className="text-[11px] font-mono text-[#5E48E8] hover:text-[#4F38D8] font-bold cursor-pointer underline"
                      >
                        Mandar resto ({money(remainderForDebtor)})
                      </button>
                    )}
                  </div>

                  <select
                    value={splitDebtorId}
                    onChange={(e) => setSplitDebtorId(e.target.value)}
                    className={ui.input}
                  >
                    <option value="">-- Seleccionar cliente fiado --</option>
                    {debtors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.saldoFavorCents > 0 ? `(A favor: ${money(d.saldoFavorCents)})` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#72729A] font-mono text-sm font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={splitDebtorAmount}
                      onChange={(e) => setSplitDebtorAmount(e.target.value)}
                      placeholder="Monto a mandar a cuenta corriente (0)"
                      className={`${ui.input} pl-8 font-mono`}
                    />
                  </div>
                </div>
              </div>

              {/* Status Box */}
              {debtorMissing ? (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  ⚠️ Ingresaste un monto de fiado pero no seleccionaste ningún cliente deudor.
                </div>
              ) : remainingCents > 0 ? (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                  <span>⚠️ Faltan <strong className="font-mono">{money(remainingCents)}</strong> para cubrir el total.</span>
                  {splitDebtorId && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentDebtor = parseFloat(splitDebtorAmount) || 0;
                        const newDebtorCents = Math.round(currentDebtor * 100) + remainingCents;
                        setSplitDebtorAmount(String(newDebtorCents / 100));
                      }}
                      className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 font-bold hover:bg-amber-300 transition text-[11px] cursor-pointer"
                    >
                      + Sumar al fiado
                    </button>
                  )}
                </div>
              ) : remainingCents === 0 ? (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between">
                  <span>✅ Total cubierto exactamente.</span>
                  {splitDebtorCents > 0 && (
                    <span className="font-mono font-bold text-amber-800">
                      (Fiado: {money(splitDebtorCents)})
                    </span>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-800">
                  💵 Vuelto en efectivo a entregar: <strong className="font-mono">{money(-remainingCents)}</strong>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  className="flex-1 py-3 px-4 rounded-full text-xs uppercase tracking-wider font-bold bg-white text-[#72729A] border border-[#EAE9F6] hover:bg-[#F8F9FE] shadow-xs transition cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy || !isCovered || debtorMissing}
                  onClick={handleConfirmSplit}
                  className="flex-1 py-3 px-4 rounded-full text-xs uppercase tracking-wider font-extrabold text-white bg-gradient-to-r from-[#6852F6] to-[#5538EA] shadow-[0_8px_20px_rgba(85,56,234,0.32)] hover:-translate-y-0.5 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
                >
                  Confirmar Cobro
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. Modal de Venta Registrada con Éxito */}
      {doneSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18182E]/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="clay-card max-w-sm w-full p-8 text-center space-y-6 rounded-3xl border border-[#EAE9F6] shadow-2xl">
            <div className="size-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto text-3xl font-black shadow-xs">
              ✓
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#72729A]">Venta Registrada</p>
              <p className="text-2xl font-black text-[#18182E]">Ticket #{doneSale.number}</p>
              <p className="text-3xl font-black text-[#5E48E8] font-mono mt-1">{money(doneSale.totalCents)}</p>
              <p className="text-xs text-[#72729A]">{doneSale.methodLabel}</p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDoneSale(null)}
                className="w-full py-3.5 px-5 rounded-full text-xs uppercase tracking-wider font-bold text-white bg-gradient-to-r from-[#6852F6] to-[#5538EA] shadow-[0_8px_20px_rgba(85,56,234,0.32)] hover:-translate-y-0.5 active:scale-95 transition cursor-pointer"
              >
                Siguiente Venta
              </button>

              {doneSale.id && (
                <Link
                  href={`/pos/receipt/${doneSale.id}`}
                  target="_blank"
                  className="w-full py-2.5 px-4 rounded-full text-xs font-bold text-[#72729A] hover:text-[#18182E] bg-white border border-[#EAE9F6] hover:bg-[#F8F9FE] shadow-xs transition text-center block"
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
