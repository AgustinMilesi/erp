"use client";

import { toast } from "sonner";
import { ui } from "@/components/ui";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      className={ui.ghost}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success("Copied.");
        } catch {
          toast.error("Couldn't copy. Select the text and copy it by hand.");
        }
      }}
    >
      {label}
    </button>
  );
}
