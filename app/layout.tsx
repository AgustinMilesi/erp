import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "VOUT Retail — Cloud POS & Retail ERP", template: "%s · VOUT Retail" },
  description: "Cloud Point of Sale, multi-store inventory, cash shifts, and managed retail operations.",
  icons: { icon: "/icon.svg" },
};

import { PreferencesProvider } from "@/components/PreferencesProvider";
import { CookieBanner } from "@/components/CookieBanner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0A0E14] text-white selection:bg-[var(--primary-accent)] selection:text-[var(--primary-accent-text)]">
        {/* Skip to Content for Keyboard Users (WCAG 2.2 SC 2.4.1) */}
        <a href="#main-content" className="sr-only skip-link">
          Saltar al contenido principal / Skip to main content
        </a>
        <PreferencesProvider>
          {children}
          <CookieBanner />
          <Toaster position="top-right" theme="dark" richColors />
        </PreferencesProvider>
      </body>
    </html>
  );
}
