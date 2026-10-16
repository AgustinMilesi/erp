// The look of the whole product, in one place. It is the same design as the
// contact page: dark navy, one rose accent, light/black headlines, underlined inputs.
export const ui = {
  label: "block text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400 mb-2",
  input:
    "w-full bg-transparent border-0 border-b border-white/10 px-0 py-3 text-lg text-white placeholder:text-slate-600 outline-none transition focus:border-rose-400",
  error: "text-rose-400 text-xs mt-1",
  button:
    "px-8 py-3 bg-rose-400 hover:bg-rose-500 disabled:bg-rose-400/50 text-slate-900 font-semibold rounded-full transition-colors text-sm uppercase tracking-wider",
  ghost:
    "px-5 py-2 border border-white/15 hover:border-rose-400 hover:text-rose-400 disabled:opacity-50 rounded-full transition-colors text-xs uppercase tracking-wider text-slate-300",
  danger:
    "px-5 py-2 border border-white/15 hover:border-rose-400 hover:bg-rose-400 hover:text-slate-900 disabled:opacity-50 rounded-full transition-colors text-xs uppercase tracking-wider text-rose-400",
  card: "border border-white/10 rounded-2xl bg-white/[0.02]",
  link: "text-white hover:text-rose-400 transition",
  muted: "text-slate-400",
} as const;
