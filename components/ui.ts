// The look of the product: Modern Claymorphism.
// Soft periwinkle canvas, white clay cards with 3D depth, vibrant royal purple accents (#5E48E8),
// pill-shaped interactive elements and ultra-smooth animations.
export const ui = {
  label: "block text-[11px] font-bold uppercase tracking-[0.15em] text-[#72729A] mb-2",
  input:
    "w-full bg-[#F8F9FE] border border-[#E2E1F4] rounded-2xl px-4 py-2.5 text-sm font-medium text-[#18182E] placeholder:text-[#94A3B8] outline-none transition-all duration-200 focus:bg-white focus:border-[#5E48E8] focus:ring-4 focus:ring-[#5E48E8]/15 shadow-inner",
  error: "text-rose-500 text-xs mt-1.5 font-medium",
  button:
    "px-6 py-2.5 bg-gradient-to-r from-[#6852F6] to-[#5538EA] hover:from-[#5C45EE] hover:to-[#4A2FE0] disabled:opacity-50 text-white font-bold rounded-2xl shadow-[0_10px_24px_rgba(85,56,234,0.3)] hover:shadow-[0_14px_28px_rgba(85,56,234,0.4)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 text-xs uppercase tracking-wider flex items-center justify-center gap-2 select-none cursor-pointer",
  ghost:
    "px-4 py-2 bg-white/90 hover:bg-white text-[#5E48E8] border border-[#E2E1F4] hover:border-[#5E48E8]/40 disabled:opacity-50 rounded-2xl transition-all duration-200 text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 select-none cursor-pointer",
  danger:
    "px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 disabled:opacity-50 rounded-2xl transition-all duration-200 text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 select-none cursor-pointer",
  card: "bg-white rounded-3xl p-6 shadow-[0_16px_36px_-8px_rgba(94,72,232,0.08),0_4px_12px_rgba(0,0,0,0.02)] border border-[#EAE9F6] transition-all duration-300 hover:shadow-[0_20px_42px_-8px_rgba(94,72,232,0.12)]",
  link: "text-[#5E48E8] hover:text-[#4A2FE0] font-semibold transition-colors",
  muted: "text-[#72729A] text-sm",
} as const;
