# 💳 VOUT Retail — Cloud Retail Engine & Point of Sale (POS)

A fast, cloud-based retail point of sale (**POS**) and store management system. Engineered for busy retail environments: sub-second barcode checkout, enforced cash drawer shifts with blind audits, atomic stock deductions (zero overselling), and instant thermal receipt printing.

<p align="left">
  <a href="https://milesi-erp.vercel.app"><img src="https://img.shields.io/badge/Live%20Demo-milesi--erp.vercel.app-f43f5e?style=for-the-badge&logo=vercel" alt="Live Demo" /></a>
  <a href="https://milesi-erp.vercel.app/demo"><img src="https://img.shields.io/badge/1--Click%20Demo%20Access-Guest%20Mode-10b981?style=for-the-badge&logo=shield" alt="1-Click Demo" /></a>
  <img src="https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.3-20232a?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-00E599?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
</p>

---

## 🎯 What is it for?

- **Fast cashier checkout**: Optimized for physical barcode scanners and full keyboard control. Supports cash, cards, bank transfers, split payments, and automatic change calculation.
- **Strict cash shift audits**: Cashiers cannot complete sales without opening a register shift. At shift close, they perform a blind count; the system automatically audits discrepancies against calculated sales.
- **Atomic inventory safety**: Stock is decremented in real time using atomic database transactions. Currency values are stored in integer cents (`BigInt`) to eliminate floating-point rounding bugs.
- **Thermal receipt printing**: Instant receipt generation formatted for standard 58mm and 80mm commercial thermal printers.
- **Bulk catalog imports**: Import thousands of products and price lists directly from Excel spreadsheets (`.xlsx`, `.xls`) or JSON files.

---

## ✨ Core Modules

| Module | Route | Capabilities |
|---|---|---|
| **POS Terminal** | `/pos` | Fullscreen cashier terminal with fast barcode lookup, cart controls, and split payments. |
| **Command Center** | `/app` | Live sales metrics, daily revenue, active cash register status, and low-stock alerts. |
| **Cash Shifts & Audits** | `/app/cash` | Shift openings with starting cash float, mid-shift drops, and blind closing audits. |
| **Products & Stock** | `/app/products` | Catalog management, SKU barcodes, cost vs. retail pricing, and inventory logs. |
| **Sales Ledger** | `/app/sales` | Complete audit trail of past sales, receipt reprinting, and safe voiding with automatic stock return. |
| **Customers & Receivables** | `/app/contacts` | Customer directory, balance tracking, and store credit ledgers. |

---

## 🛠️ Tech Stack

- **Frontend & Backend**: Next.js 16 (App Router, Server Actions) + React 19
- **Language**: TypeScript (strict typing throughout)
- **Styling**: Tailwind CSS 4 (dark mode, light mode, and color themes)
- **Database**: PostgreSQL Serverless (Neon) with PgBouncer connection pooling
- **ORM**: Prisma ORM
- **Validation**: Zod (POS payloads, products, and checkout actions)
- **Spreadsheet Engine**: SheetJS (XLSX) for catalog imports
- **Localization**: Multi-language support (English, Spanish, Portuguese, Chinese)

---

## ⚡ Quick Test (No Registration Needed)

Try the full cashier workflow instantly:
- **[1-Click Demo Login](https://milesi-erp.vercel.app/demo)** (opens `/app` immediately with an active register and sample products).
- Or visit [milesi-erp.vercel.app/login](https://milesi-erp.vercel.app/login) and click **"Entrar como Invitado (Modo Demo)"**.

---

## 🚀 Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/AgustinMilesi/retail.git
cd retail

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Generate Prisma client & start development server
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### ⚡ The VOUT Software Ecosystem
- [📱 VOUT Pocket](https://github.com/AgustinMilesi/expenses) — Mobile cost, subscription, and micro-spending tracker with React Native.
- [📥 VOUT Inbox](https://github.com/AgustinMilesi/inbox) — Multi-tenant customer inquiry inbox and embeddable forms.
- [🚢 VOUT Cargo](https://github.com/AgustinMilesi/cargo) — International freight forwarding, customs clearance, and container tracking.
- [📬 VOUT Connect](https://github.com/AgustinMilesi/contact) — Minimalist contact form and lead gateway with Zod validation.
