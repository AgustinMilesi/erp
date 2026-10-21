// The look of the product: VOUT Pocket Design System.
// Deep obsidian canvas (#0A0E14), solid dark cards (#121824) with 1px slate borders (#1E293B),
// dynamic reactive accents (Cyber-Lime #C6F827 flagship + palettes), pill-shaped interactive elements.
export const ui = {
  label: "block text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-2",
  input:
    "w-full bg-[#0F1520] border border-[#1E293B] rounded-2xl px-4 py-2.5 text-sm font-medium text-white placeholder:text-[#64748B] outline-none transition-all duration-200 focus:bg-[#121824] focus:border-[var(--primary-accent)] focus:ring-4 focus:ring-[var(--primary-accent-shadow)] shadow-inner",
  error: "text-rose-500 text-xs mt-1.5 font-medium",
  button:
    "px-6 py-2.5 bg-[var(--primary-accent)] hover:bg-[var(--primary-accent-hover)] disabled:opacity-50 text-[var(--primary-accent-text,#0A0E14)] font-black rounded-2xl shadow-[0_10px_24px_var(--primary-accent-shadow)] hover:shadow-[0_14px_28px_var(--primary-accent-shadow)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 text-xs uppercase tracking-wider flex items-center justify-center gap-2 select-none cursor-pointer",
  ghost:
    "px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-[#1E293B] hover:border-[var(--primary-accent)]/50 disabled:opacity-50 rounded-2xl transition-all duration-200 text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 select-none cursor-pointer",
  danger:
    "px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 disabled:opacity-50 rounded-2xl transition-all duration-200 text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 select-none cursor-pointer",
  card: "bg-[#121824] rounded-3xl p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.5)] border border-[#1E293B] transition-all duration-300 hover:shadow-[0_20px_42px_-8px_rgba(0,0,0,0.7)] hover:border-[var(--primary-accent)]/40",
  link: "text-[var(--primary-accent)] hover:underline font-semibold transition-colors",
  muted: "text-[#94A3B8] text-sm",
} as const;
