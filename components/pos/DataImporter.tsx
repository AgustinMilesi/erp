"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ui } from "@/components/ui";
import { importDataAction } from "@/app/actions/import";

export function DataImporter() {
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) {
      toast.error("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileInputRef.current.files[0]);

    setBusy(true);
    try {
      const res = await importDataAction(formData);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "Import completed!");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error uploading file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div className="space-y-1">
        <label className={ui.label} htmlFor="import-file">
          Select Backup JSON or Excel (.xlsx, .xls)
        </label>
        <input
          id="import-file"
          ref={fileInputRef}
          type="file"
          accept=".json, .xlsx, .xls"
          disabled={busy}
          className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:uppercase file:tracking-wider file:font-semibold file:bg-rose-400 file:text-slate-900 hover:file:bg-rose-500 cursor-pointer"
        />
        <p className="text-xs text-slate-500 pt-1">
          Compatible with marierp backups (inventory, barcodes, categories & debtors) and Excel catalogs.
        </p>
      </div>

      <button type="submit" disabled={busy} className={ui.button}>
        {busy ? "Importing data..." : "Start Import"}
      </button>
    </form>
  );
}
