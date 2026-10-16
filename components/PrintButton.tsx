"use client";

import { useEffect, useState } from "react";
import { ui } from "@/components/ui";

export function PrintButton() {
  const [thermalWidth, setThermalWidth] = useState<"80" | "58">("80");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center bg-white/5 border border-white/10 rounded-md p-0.5 text-xs">
        <button
          type="button"
          onClick={() => {
            setThermalWidth("80");
            document.documentElement.style.setProperty("--ticket-width", "80mm");
          }}
          className={`px-2 py-1 rounded transition ${thermalWidth === "80" ? "bg-white/20 text-white font-medium" : "text-slate-400 hover:text-white"}`}
        >
          80mm
        </button>
        <button
          type="button"
          onClick={() => {
            setThermalWidth("58");
            document.documentElement.style.setProperty("--ticket-width", "58mm");
          }}
          className={`px-2 py-1 rounded transition ${thermalWidth === "58" ? "bg-white/20 text-white font-medium" : "text-slate-400 hover:text-white"}`}
        >
          58mm
        </button>
      </div>

      <button
        type="button"
        className={ui.button}
        onClick={() => window.print()}
      >
        Print Ticket (Ctrl+P)
      </button>
    </div>
  );
}

