"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePreferences } from "@/components/PreferencesProvider";

type ItemKey =
  | "overview"
  | "pos"
  | "sales"
  | "products"
  | "cash"
  | "inbox"
  | "contacts"
  | "forms"
  | "settings"
  | "debtors"
  | "expenses";
type Item = { href: string; key: ItemKey; label: string; badge?: number };

export function NavLinks({ items, onItemClick }: { items: Item[]; onItemClick?: () => void }) {
  const pathname = usePathname();
  const { t } = usePreferences();

  const navIcons: Record<string, string> = {
    overview: "📊",
    pos: "⚡",
    sales: "🧾",
    products: "📦",
    debtors: "📒",
    expenses: "💸",
    cash: "💵",
    inbox: "💬",
    contacts: "👥",
    forms: "📝",
    settings: "⚙️",
  };

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        const translatedLabel = t[item.key] || item.label;
        const icon = navIcons[item.key] || "📌";

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={onItemClick}
            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-200 select-none ${
              active
                ? "bg-gradient-to-r from-[#6852F6] to-[#5538EA] text-white shadow-[0_8px_20px_rgba(85,56,234,0.32)] -translate-y-0.5"
                : "text-[#72729A] hover:text-[#18182E] hover:bg-[#F3F2FD] border border-transparent hover:border-[#EAE9F6]"
            }`}
          >
            <span className="flex items-center gap-2.5 truncate">
              <span className="text-sm shrink-0">{icon}</span>
              <span className="truncate">{translatedLabel}</span>
            </span>
            {item.badge ? (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
