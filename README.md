<div align="center">

# ⚡ VOUT Retail
### Cloud Point of Sale, Cash Drawer Audits & High-Throughput Store Engine

[![VOUT Ecosystem](https://img.shields.io/badge/VOUT-Ecosystem-C6F827?style=for-the-badge&logoColor=black&labelColor=0A0E14)](https://github.com/AgustinMilesi)
[![VOUT ID](https://img.shields.io/badge/VOUT_ID-Unified_Pass-C6F827?style=for-the-badge&logo=shield&logoColor=black&labelColor=0A0E14)](https://milesi-erp.vercel.app/login)
[![Live Demo](https://img.shields.io/badge/Live_Demo-milesi--erp.vercel.app-C6F827?style=for-the-badge&logo=vercel&logoColor=black&labelColor=0A0E14)](https://milesi-erp.vercel.app)
[![1-Click Demo](https://img.shields.io/badge/1--Click_Demo-Guest_Access-10b981?style=for-the-badge&logoColor=white&labelColor=0A0E14)](https://milesi-erp.vercel.app/demo)

</div>

---

## 🎯 Overview

**VOUT Retail** is an enterprise-grade cloud POS and retail management system engineered for high-throughput retail stores.
- ⚡ **Sub-second Checkout:** Barcode scanner support, keyboard shortcuts, split payments (cash + card + transfer), and automatic change calculation.
- 🔒 **Blind Cash Drawer Audits:** Enforced cash shift opening floats, mid-shift drops, and discrepancy auditing.
- 📦 **Atomic Inventory Protection:** Real-time atomic database transactions with integer-cent (`BigInt`) currency math verified by 13 automated unit tests.
- 🖨️ **Thermal Receipts:** Instant printing formatted for 58mm & 80mm commercial thermal printers.
- 🔑 **Cuenta VOUT (VOUT ID):** Unified single-sign-on access compatible across the entire VOUT ecosystem.

---

## ⚡ Core Modules

| Module | Route | Capabilities |
|---|---|---|
| **POS Terminal** | `/pos` | Fullscreen cashier interface with fast barcode lookup & cart split payments. |
| **Command Center** | `/app` | Live sales metrics, daily revenue, active register status & low-stock alerts. |
| **Cash Shifts** | `/app/cash` | Shift openings with float, mid-shift cash drops & blind closing audits. |
| **Catalog & Stock** | `/app/products` | Barcode SKUs, cost vs. retail pricing & inventory deduction logs. |
| **Sales Ledger** | `/app/sales` | Audit trail of past sales, receipt reprinting & safe voiding with stock return. |

---

## 🛠️ Stack

`Next.js 16` • `React 19` • `TypeScript` • `PostgreSQL Serverless (Neon)` • `Prisma ORM` • `Tailwind CSS v4` • `Zod`

---

## 🚀 Quickstart

```bash
# Clone and enter directory
git clone https://github.com/AgustinMilesi/retail.git
cd retail

# Install dependencies & start
npm install
npx prisma generate
npm run dev
```

---

### ⚡ The VOUT Software Ecosystem
- [📱 VOUT Pocket](https://github.com/AgustinMilesi/expenses) — Mobile cost, subscription & micro-spending tracker.
- [📥 VOUT Inbox](https://github.com/AgustinMilesi/inbox) — Multi-tenant customer feedback & embeddable forms.
- [🚢 VOUT Cargo](https://github.com/AgustinMilesi/cargo) — Freight forwarding & customs tracking operating system.
- [📬 VOUT Connect](https://github.com/AgustinMilesi/contact) — High-conversion contact portal with anti-spam protection.
