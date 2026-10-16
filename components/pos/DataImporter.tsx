"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ui } from "@/components/ui";
import { importDataAction } from "@/app/actions/import";
import { usePreferences } from "@/components/PreferencesProvider";

export function DataImporter() {
  const { t } = usePreferences();
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) {
      toast.error(t.selectFile);
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
        toast.success(res.message || t.save);
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
          {t.selectFile}
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
          {t.importDesc}
        </p>
      </div>

      <button type="submit" disabled={busy} className={ui.button}>
        {busy ? t.importing : t.uploadAndImport}
      </button>
    </form>
  );
}
