"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ui } from "@/components/ui";
import { importDataAction } from "@/app/actions/import";
import { usePreferences } from "@/components/PreferencesProvider";

export function DataImporter() {
  const { t } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = selectedFile || fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error(t.selectFile);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setBusy(true);
    try {
      const res = await importDataAction(formData);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success(res.message || t.save);
        setSelectedFile(null);
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-rose-400/10 text-rose-400 border border-rose-400/20">
          📄 JSON (marierp)
        </span>
        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
          📊 Excel (.xlsx, .xls)
        </span>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="import-file"
          className="border-2 border-dashed border-white/15 hover:border-rose-400/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-white/[0.01] hover:bg-white/[0.03]"
        >
          <div className="w-10 h-10 rounded-full bg-rose-400/10 text-rose-400 flex items-center justify-center mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm text-slate-200 font-medium">
            {selectedFile ? (
              <span className="text-rose-400 font-bold">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            ) : (
              <span>Hacé clic acá para seleccionar tu archivo <strong>JSON</strong> o <strong>Excel</strong></span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {t.importDesc}
          </p>
          <input
            id="import-file"
            ref={fileInputRef}
            type="file"
            accept=".json, .xlsx, .xls"
            disabled={busy}
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="sr-only"
          />
        </label>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="submit"
          disabled={busy || !selectedFile}
          className={`${ui.button} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {busy ? t.importing : t.uploadAndImport}
        </button>

        {selectedFile && (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
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
