import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://milesi-erp.vercel.app"),
  title: { default: "VOUT Retail · Cloud POS & Retail Inventory Engine", template: "%s · VOUT Retail" },
  description:
    "High-throughput Cloud Point of Sale and store inventory engine. Barcode scanner checkout, blind cash drawer shifts, atomic inventory transactions, and thermal receipt printing.",
  applicationName: "VOUT Retail",
  keywords: [
    "Point of Sale",
    "POS",
    "Retail ERP",
    "Control de Stock",
    "Arqueo de Caja",
    "Lector de Códigos de Barra",
    "Next.js",
    "Prisma",
    "Agustín Milesi",
  ],
  authors: [{ name: "Agustín Milesi", url: "https://github.com/AgustinMilesi" }],
  creator: "Agustín Milesi",
  publisher: "VOUT Ecosystem",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "VOUT Retail · Cloud POS & Inventory Engine",
    description:
      "High-throughput Point of Sale with blind cash drawer shifts, atomic inventory audits, and thermal receipt printing.",
    url: "https://milesi-erp.vercel.app",
    siteName: "VOUT Retail",
    locale: "es_AR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VOUT Retail · Cloud POS & Inventory Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VOUT Retail · Cloud POS & Store Management Engine",
    description: "High-throughput Point of Sale and store management engine.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "VOUT Retail",
  operatingSystem: "Web (Desktop, Tablet, Mobile)",
  applicationCategory: "BusinessApplication",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "Agustín Milesi",
    url: "https://github.com/AgustinMilesi",
  },
  description:
    "Cloud Point of Sale, multi-store inventory audits, blind cash drawer shifts, barcode scanning, and thermal printing.",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
