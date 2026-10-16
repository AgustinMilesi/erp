import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "ERP & POS", template: "%s · ERP" },
  description: "Point of sale, inventory control, cash shifts and customer management.",
};

import { PreferencesProvider } from "@/components/PreferencesProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0f1f] text-slate-50">
        <PreferencesProvider>
          {children}
          <Toaster position="top-right" theme="dark" richColors />
        </PreferencesProvider>
      </body>
    </html>
  );
}
