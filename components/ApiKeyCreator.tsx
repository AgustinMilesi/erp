"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createApiKey } from "@/app/actions/dashboard";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";

export function ApiKeyCreator() {
  const [key, setKey] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col sm:flex-row sm:items-end gap-4"
        action={async (formData) => {
          const result = await createApiKey(formData);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setKey(result.data?.key ?? null);
          toast.success(result.message);
        }}
      >
        <div className="flex-1">
          <label className={ui.label} htmlFor="api-key-name">Key name</label>
          <input
            id="api-key-name"
            name="name"
            required
            maxLength={60}
            placeholder="ERP production"
            className={ui.input}
          />
        </div>
        <SubmitButton pendingText="Creating...">Create key</SubmitButton>
      </form>

      {key && (
        <div className={`${ui.card} p-4 space-y-3`}>
          <p className={ui.label}>Your new key, shown only once</p>
          <code className="block break-all text-rose-400 text-sm">{key}</code>
          <div className="flex gap-3">
            <CopyButton text={key} />
            <button type="button" className={ui.ghost} onClick={() => setKey(null)}>
              I saved it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
