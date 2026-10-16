"use client";

import { ui } from "@/components/ui";

export function PrintButton() {
  return (
    <button type="button" className={ui.ghost} onClick={() => window.print()}>
      Print
    </button>
  );
}
