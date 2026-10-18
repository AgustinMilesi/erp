# 💳 Retail ERP & Point of Sale (POS) Engine

A mission-critical enterprise resource planning (**ERP**) and retail point of sale (**POS**) platform engineered for high-throughput retail operations, sub-second checkout speeds, strict cash drawer reconciliation, and atomic inventory tracking.

Built as a multi-tenant cloud solution, it allows retail businesses to manage sales, live stock deductions, cash shifts, team roles, and customer receivables with zero tolerance for fiscal discrepancies or inventory drift.

![Production Status](https://img.shields.io/badge/Status-Live%20in%20Production-success?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-00E599?style=for-the-badge&logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
[![GitHub stars](https://img.shields.io/github/stars/AgustinMilesi/erp?style=for-the-badge&logo=github&color=gold)](https://github.com/AgustinMilesi/erp/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/AgustinMilesi/erp?style=for-the-badge&logo=github&color=blue)](https://github.com/AgustinMilesi/erp/network/members)

🌐 **Production Deployment:** [milesi-erp.vercel.app](https://milesi-erp.vercel.app)

---

## 🌐 Complete Ecosystem Suite

This ERP is the central engine of a unified 4-tier retail & commercial enterprise architecture:

| Component | Repository | Live Deployment | Role & Operational Focus |
|---|---|---|---|
| **Retail ERP & POS** | [AgustinMilesi/erp](https://github.com/AgustinMilesi/erp) | [milesi-erp.vercel.app](https://milesi-erp.vercel.app) | Core cloud operating system, atomic inventory ledger, blind cash shifts, thermal ticket printing, and cashier POS. *(This Repository)* |
| **Customer Inbox SaaS** | [AgustinMilesi/saas](https://github.com/AgustinMilesi/saas) | [saas-am.vercel.app](https://saas-am.vercel.app) | Multi-tenant customer inbox, embeddable contact forms, contact directory, and CRM leads bridge. |
| **Contact Portal** | [AgustinMilesi/contact](https://github.com/AgustinMilesi/contact) | [agustinmilesi-contact.vercel.app](https://agustinmilesi-contact.vercel.app) | High-intent lead generation portal, anti-spam validation gateway, and email delivery dispatch. |
| **Offline Retail ERP** | [AgustinMilesi/marierp](https://github.com/AgustinMilesi/marierp) | [GitHub Repository](https://github.com/AgustinMilesi/marierp) | 100% offline-first grocery & retail POS with IndexedDB storage, order tabs, and luxury teal/gold interface. |

---

## 🎯 What Problems Does This Engine Solve?

Many retail stores face cash discrepancies at shift changes, duplicate charges caused by unstable network connections, and inventory mismatches between the shelves and the system. This platform is built to eliminate these operational pain points:

- ⚡ **High-Speed POS Checkout:** Optimized for physical barcode scanners and full-keyboard navigation. Accepts Cash, Cards, Bank Transfers, and Split Payments with automatic change calculation.
- 🔒 **Enforced Cash Shifts (Drawer Audits):** Sales are strictly locked unless a shift register is open. At closing, cashiers perform a blind count; the system compares counted cash against calculated cash and audits discrepancies.
- 📦 **Atomic Inventory Ledger:** Stock is decremented in real-time within atomic database transactions. If two cashiers scan the last remaining item at the exact same millisecond, concurrency locks ensure only one sale goes through without overselling.
- 🧾 **Thermal Ticket Printing:** Instant receipt generation formatted for standard 80mm and 58mm thermal printers (Epson, Hasar, custom mini POS).
- 📥 **Zero-Loss Data Importer:** Import catalogs directly from legacy **marierp** backups (`.json`) or spreadsheet files (`.xlsx`, `.xls`).
- 🌐 **Comprehensive Multilingual Engine:** Full support for **Spanish**, **English**, **Portuguese**, and **Chinese** with server/client instant synchronization.
- 🎨 **Personalization:** Multiple color themes, customizable business timezones, and role permissions.

---

## 🏢 Core Modules

| Module | Route | Capabilities |
|---|---|---|
| **Command Center (Overview)** | `/app` | Live sales KPIs, daily revenue, cash register status, recent receipts, and low-stock alerts. |
| **Point of Sale Terminal** | `/pos` | Fullscreen cashier terminal with barcode scanner search, cart adjustments, customer attachment, and split tender. |
| **Sales Ledger** | `/app/sales` | Complete audit trail of finalized sales, payment methods breakdown, and safe voiding with automatic stock re-entry. |
| **Thermal Receipt** | `/pos/receipt/:id` | Print-ready receipt ticket with itemized tax breakdown, payment method distribution, and change calculation. |
| **Products & Inventory** | `/app/products` | Catalog management with SKU, barcodes, tax rates, cost vs. retail pricing, categories, and inventory logs. |
| **Cash Shifts & Audits** | `/app/cash` | Shift openings with starting float, mid-shift cash drops/payouts, and end-of-day drawer reconciliation. |
| **Customers & Receivables** | `/app/contacts` | Customer directory, debt logs, contact information, and CRM sync. |
| **Team Management** | `/app/settings` | Multi-role user management (`Owner`, `Admin`, `Cashier`) with secure email invitations. |
| **Developer API & Keys** | `/app/settings` | REST API keys for external POS hardware, eCommerce synchronization, and webhooks. |

---

## 🛡️ Reliability & Commercial Safety Guarantees

1. 💰 **Integer-Cent Monetary Math (Zero Float Drift):** All money values are strictly stored and computed as integer cents (`BigInt`), completely eliminating JavaScript floating-point rounding errors (`0.1 + 0.2 !== 0.3`).
2. 🔒 **Server-Enforced Pricing:** The client only sends product IDs and quantities. Live prices, active discounts, and tax rates are resolved strictly on the server at execution time.
3. ⚡ **All-or-Nothing Atomic Transactions:** Stock checking, inventory deduction, sequential receipt numbering, and payment records execute within a single database transaction. If the connection drops midway, the transaction aborts and no state is corrupted.
4. 🔁 **Idempotent Payment Submissions:** Every checkout request bears an idempotency key. If a cashier double-taps the pay button or the network blinks, the system returns the original completed receipt without charging twice.
5. 🔢 **Zero-Gap Sequential Receipt Numbers:** Receipt numbers are monotonically incremented per workspace without skipped gaps.
6. 🔐 **Enterprise Security:** Passwords hashed via memory-hard `scrypt` ($N=2^{15}, r=8, p=3$), sessions protected by `__Host-` cookies with SHA-256 database tokens, and DB-backed rate limiters.

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server Components, Turbopack, Server Actions |
| **Language** | TypeScript 5 | Strict mode with exhaustive type coverage |
| **Styling** | Tailwind CSS 4 | Custom dark mode palette, CSS variables for multi-theme switching |
| **Database** | PostgreSQL (Neon) | Serverless Postgres with pooled connections |
| **ORM** | Prisma | Schema migrations, typed client, and connection management |
| **Validation** | Zod | Robust schema validation for POS payloads and imports |
| **Spreadsheet Engine** | XLSX (SheetJS) | High-performance streaming parser for Excel catalog imports |
| **Testing** | Node.js Test Runner + tsx | Automated unit testing for monetary calculations and sale math |

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js** v20.9+
- A **PostgreSQL** database (a free project on [Neon.tech](https://neon.tech) works immediately)

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/AgustinMilesi/erp.git
cd erp

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env        # On Windows PowerShell: Copy-Item .env.example .env

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `DATABASE_URL` | Yes | Neon pooled connection string (`-pooler.`) for Next.js runtime & queries | `postgresql://user:pass@ep-xyz-pooler.region.aws.neon.tech/erp?sslmode=require` |
| `DIRECT_URL` | Yes | Neon direct unpooled connection string for Prisma migrations & schema changes | `postgresql://user:pass@ep-xyz.region.aws.neon.tech/erp?sslmode=require` |
| `APP_URL` | Yes | Public application URL (e.g. `https://milesi-erp.vercel.app`) | `http://localhost:3000` / `https://milesi-erp.vercel.app` |
| `APP_TIMEZONE` | No | Default business timezone | `America/Argentina/Buenos_Aires` |
| `RESEND_API_KEY` | No (Dev) | API key from [Resend](https://resend.com) for team invites & password resets | `re_123456789` (prints to console in dev if omitted) |
| `EMAIL_FROM` | Yes | Sender email for transactional messages | `Retail ERP <onboarding@resend.dev>` |

---

## 🔌 REST API for Developers

External POS scanners, webshops, or ERP integrations authenticate using Bearer tokens:

```http
Authorization: Bearer cs_your_api_key_here
```

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/products` | Query products by name, SKU, or barcode |
| `GET` | `/api/v1/sales` | Paginated sales log with itemized breakdowns |
| `GET` | `/api/v1/contacts` | Search customer and debtor directory |
| `POST` | `/api/v1/contacts` | Create or update customer profiles externally |

---

## 🧪 Testing & Code Quality

The codebase enforces strict test suites, linting, and type checking:

```bash
# Typecheck TypeScript definitions
npm run typecheck

# Lint codebase
npm run lint

# Run mathematical & monetary unit tests
npm test
```

---

## ⭐ Show Your Support

If you find this project useful or interesting, please give it a **Star** on GitHub! It helps more developers discover the ecosystem.

[![Star on GitHub](https://img.shields.io/static/v1?label=Star%20Repo&message=%E2%AD%90&color=yellow&style=for-the-badge&logo=github)](https://github.com/AgustinMilesi/erp)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
