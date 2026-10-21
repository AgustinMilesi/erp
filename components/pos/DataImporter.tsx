"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ui } from "@/components/ui";
import { usePreferences } from "@/components/PreferencesProvider";

type DetectedSummary = {
  productsCount: number;
  debtorsCount: number;
  expensesCount: number;
  salesCount: number;
};

export function DataImporter() {
  const { t } = usePreferences();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [progressPct, setProgressPct] = useState<number>(0);
  const [detected, setDetected] = useState<DetectedSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(file: File | null) {
    setSelectedFile(file);
    setDetected(null);
    setProgressMsg("");
    setProgressPct(0);
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".json")) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        let products = 0;
        let debtors = 0;
        let expenses = 0;
        let sales = 0;

        if (Array.isArray(data)) {
          products = data.length;
        } else if (data && typeof data === "object") {
          if (Array.isArray(data.loDeMari_inventory)) products = data.loDeMari_inventory.length;
          else if (Array.isArray(data.products)) products = data.products.length;

          if (Array.isArray(data.loDeMari_debtors)) debtors = data.loDeMari_debtors.length;
          else if (Array.isArray(data.debtors)) debtors = data.debtors.length;

          if (data.loDeMari_allExpenses && typeof data.loDeMari_allExpenses === "object") {
            for (const list of Object.values(data.loDeMari_allExpenses)) {
              if (Array.isArray(list)) expenses += list.length;
            }
          }

          if (Array.isArray(data.loDeMari_salesHistory)) sales = data.loDeMari_salesHistory.length;
        }
        setDetected({ productsCount: products, debtorsCount: debtors, expensesCount: expenses, salesCount: sales });
      } catch {
        // Ignored
      }
    }
  }

  async function sendChunk(kind: string, items: unknown[]) {
    const res = await fetch("/api/import/chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, items }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error importando lote de ${kind}`);
    }
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = selectedFile || fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error(t.selectFile);
      return;
    }

    setBusy(true);
    setProgressPct(5);
    setProgressMsg("Leyendo archivo...");

    try {
      const filename = file.name.toLowerCase();

      if (filename.endsWith(".json")) {
        const text = await file.text();
        const data = JSON.parse(text);

        // 1. Categories & Products
        const rawInventory = Array.isArray(data)
          ? data
          : Array.isArray(data?.loDeMari_inventory)
          ? data.loDeMari_inventory
          : Array.isArray(data?.products)
          ? data.products
          : [];

        if (rawInventory.length > 0) {
          const catSet = new Set<string>();
          for (const it of rawInventory) {
            const cat = String(it.category || "General").trim();
            if (cat) catSet.add(cat);
          }
          await sendChunk("categories", Array.from(catSet));

          const CHUNK = 100;
          for (let i = 0; i < rawInventory.length; i += CHUNK) {
            const slice = rawInventory.slice(i, i + CHUNK);
            const pct = Math.round(10 + (i / rawInventory.length) * 30);
            setProgressPct(pct);
            setProgressMsg(`Importando productos: ${i + slice.length} de ${rawInventory.length}...`);
            await sendChunk("products", slice);
          }
        }

        // 2. Debtors (Cuentas corrientes / fiados)
        const rawDebtors = Array.isArray(data?.loDeMari_debtors)
          ? data.loDeMari_debtors
          : Array.isArray(data?.debtors)
          ? data.debtors
          : [];

        if (rawDebtors.length > 0) {
          const CHUNK_DEBTORS = 10;
          for (let i = 0; i < rawDebtors.length; i += CHUNK_DEBTORS) {
            const slice = rawDebtors.slice(i, i + CHUNK_DEBTORS);
            const pct = Math.round(40 + (i / rawDebtors.length) * 15);
            setProgressPct(pct);
            setProgressMsg(`Importando deudores: ${i + slice.length} de ${rawDebtors.length}...`);
            await sendChunk("debtors", slice);
          }
        }

        // 3. Expenses / Facturas
        const rawExpensesObj = data?.loDeMari_allExpenses || data?.allExpenses || data?.expenses || {};
        const expenseList: Record<string, unknown>[] = [];
        if (Array.isArray(rawExpensesObj)) {
          for (const exp of rawExpensesObj) {
            if (exp.description && exp.amount) expenseList.push(exp);
          }
        } else if (typeof rawExpensesObj === "object") {
          for (const [dateStr, expList] of Object.entries(rawExpensesObj)) {
            if (Array.isArray(expList)) {
              for (const exp of expList as Record<string, unknown>[]) {
                if (exp.description && exp.amount) {
                  expenseList.push({ ...exp, date: dateStr });
                }
              }
            }
          }
        }

        if (expenseList.length > 0) {
          const CHUNK = 200;
          for (let i = 0; i < expenseList.length; i += CHUNK) {
            const slice = expenseList.slice(i, i + CHUNK);
            const pct = Math.round(55 + (i / expenseList.length) * 15);
            setProgressPct(pct);
            setProgressMsg(`Importando gastos y facturas: ${i + slice.length} de ${expenseList.length}...`);
            await sendChunk("expenses", slice);
          }
        }

        // 4. Sales History
        const rawSales = Array.isArray(data?.loDeMari_salesHistory) ? data.loDeMari_salesHistory : [];
        if (rawSales.length > 0) {
          const CHUNK = 200;
          for (let i = 0; i < rawSales.length; i += CHUNK) {
            const slice = rawSales.slice(i, i + CHUNK);
            const pct = Math.round(70 + (i / rawSales.length) * 28);
            setProgressPct(pct);
            setProgressMsg(`Importando ventas: ${i + slice.length} de ${rawSales.length}...`);
            await sendChunk("sales", slice);
          }
        }

        setProgressPct(100);
        setProgressMsg("¡Listo! Actualizando datos...");
        toast.success("¡Importación completada con éxito!");
      } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error("La planilla no contiene hojas de cálculo.");

        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        if (rows.length === 0) throw new Error("La planilla de Excel está vacía.");

        const normalizedProducts = rows
          .map((r) => {
            const name = String(r.Nombre || r.nombre || r.Name || r.name || r.Producto || r.producto || "").trim();
            if (!name) return null;

            const priceRaw = r.Precio || r.precio || r.Price || r.price || r.PVP || r.pvp || 0;
            const price = typeof priceRaw === "number" ? priceRaw : parseFloat(String(priceRaw).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

            const barcodeRaw = r["Codigo de barra"] || r.Codigo || r.codigo || r.Barcode || r.barcode || "";
            const barcode = barcodeRaw ? String(barcodeRaw).trim() : null;
            const sku = String(r.SKU || r.sku || barcode || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`).trim();
            const category = String(r.Categoria || r.categoria || r.Category || "General").trim();

            return {
              name,
              price,
              sku,
              barcode,
              category,
              stock: Number(r.Stock || r.stock || 0),
            };
          })
          .filter(Boolean);

        const catSet = new Set<string>();
        for (const p of normalizedProducts) {
          if (p?.category) catSet.add(p.category);
        }
        await sendChunk("categories", Array.from(catSet));

        const CHUNK = 100;
        for (let i = 0; i < normalizedProducts.length; i += CHUNK) {
          const slice = normalizedProducts.slice(i, i + CHUNK);
          const pct = Math.round(10 + (i / normalizedProducts.length) * 85);
          setProgressPct(pct);
          setProgressMsg(`Importando productos: ${i + slice.length} de ${normalizedProducts.length}...`);
          await sendChunk("products", slice);
        }

        setProgressPct(100);
        setProgressMsg("¡Listo! Actualizando catálogo...");
        toast.success(`¡Planilla Excel importada! (${normalizedProducts.length} productos procesados)`);
      } else {
        throw new Error("Formato no soportado. Cargá un archivo .json o Excel (.xlsx/.xls).");
      }

      setSelectedFile(null);
      setDetected(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => {
        router.refresh();
      }, 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar los datos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30">
          Backup Completo JSON
        </span>
        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
          Catálogo Excel (.xlsx, .xls)
        </span>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="import-file"
          className="border-2 border-dashed border-white/15 hover:border-[var(--primary-accent)]/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-white/[0.01] hover:bg-white/[0.03]"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] flex items-center justify-center mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm text-slate-200 font-medium">
            {selectedFile ? (
              <span className="text-[var(--primary-accent)] font-bold">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            ) : (
              <span>Hacé clic acá para seleccionar tu archivo <strong>JSON</strong> o <strong>Excel</strong></span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Detecta automáticamente productos, comidas, deudores, facturas y ventas históricas.
          </p>
          <input
            id="import-file"
            ref={fileInputRef}
            type="file"
            accept=".json, .xlsx, .xls"
            disabled={busy}
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="sr-only"
          />
        </label>
      </div>

      {detected && (
        <div className="p-3.5 rounded-xl border border-[var(--primary-accent)]/30 bg-[var(--primary-accent)]/[0.05] text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-[var(--primary-accent)]">Archivo de backup reconocido:</p>
          <div className="flex flex-wrap gap-4 text-slate-400 pt-0.5">
            <span><strong>{detected.productsCount}</strong> productos / comida</span>
            {detected.debtorsCount > 0 && <span><strong>{detected.debtorsCount}</strong> deudores (cuentas corrientes)</span>}
            {detected.expensesCount > 0 && <span><strong>{detected.expensesCount}</strong> gastos y facturas</span>}
            {detected.salesCount > 0 && <span><strong>{detected.salesCount}</strong> ventas históricas</span>}
          </div>
        </div>
      )}

      {busy && (
        <div className="space-y-2 p-3 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex justify-between text-xs text-slate-300 font-medium">
            <span>{progressMsg}</span>
            <span className="font-mono text-[var(--primary-accent)]">{progressPct}%</span>
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[var(--primary-accent)] h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          type="submit"
          disabled={busy || !selectedFile}
          className={`${ui.button} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {busy ? "Importando datos..." : "Cargar e Importar"}
        </button>

        {selectedFile && !busy && (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setDetected(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            {t.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
