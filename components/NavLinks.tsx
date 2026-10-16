"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePreferences } from "@/components/PreferencesProvider";

type ItemKey = "overview" | "pos" | "sales" | "products" | "cash" | "inbox" | "contacts" | "forms" | "settings";
type Item = { href: string; key: ItemKey; label: string; badge?: number };

export function NavLinks({ items }: { items: Item[] }) {
  const pathname = usePathname();
  const { t } = usePreferences();

  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto">
      {items.map((item) => {
        const active =
          item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        const translatedLabel = t[item.key] || item.label;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-full text-sm uppercase tracking-wider transition-colors whitespace-nowrap ${
              active ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            {translatedLabel}
            {item.badge ? (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-400 text-slate-900 text-[11px] font-semibold flex items-center justify-center">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
