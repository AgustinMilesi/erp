<div align="center">

# ⚡ VOUT Retail
### Managed Cloud POS, Atomic Inventory & Store Operations Platform

[![VOUT Ecosystem](https://img.shields.io/badge/VOUT-Managed_Cloud-C6F827?style=for-the-badge&logoColor=black&labelColor=0A0E14)](https://github.com/AgustinMilesi)
[![SLA](https://img.shields.io/badge/SLA-99.9%25_Uptime-C6F827?style=for-the-badge&logo=shield&logoColor=black&labelColor=0A0E14)](https://milesi-erp.vercel.app/legal)
[![Live Demo](https://img.shields.io/badge/Live_Service-milesi--erp.vercel.app-C6F827?style=for-the-badge&logo=vercel&logoColor=black&labelColor=0A0E14)](https://milesi-erp.vercel.app)
[![1-Click Demo](https://img.shields.io/badge/1--Click_Demo-Acceso_Invitado-10b981?style=for-the-badge&logoColor=white&labelColor=0A0E14)](https://milesi-erp.vercel.app/demo)

<p align="center">
  <strong>Infraestructura administrada en la nube para puntos de venta y comercios de alto volumen de transacciones.</strong>
</p>

</div>

---

## 🎯 Modelo de Servicio Administrado (Managed SaaS)

**VOUT Retail** se entrega como un servicio llave en mano alojado en la nube. Los comercios suscriptores se benefician de:
- 🚀 **Zero-DevOps:** Servidores gestionados de alta disponibilidad sin requerir personal de IT propio ni servidores locales propensos a fallos.
- ⚡ **Cobro Sub-segundo:** Lector de código de barras, atajos de teclado, pagos combinados (efectivo, débito, transferencias) y vuelto automático.
- 🔒 **Arqueos Ciegos de Caja:** Apertura con fondo fijo, retiros de dinero auditados durante el turno y cierre ciego con reporte de diferencias.
- 📦 **Inventario Atómico Protegido:** Operaciones transaccionales en tiempo real con matemática exacta de dinero en centavos enteros (`BigInt`) verificada por 13 tests automáticos.
- 🖨️ **Tickets Térmicos:** Emisión y reimpresión de comprobantes para impresoras térmicas de 58mm y 80mm.
- 🔑 **Cuenta VOUT (VOUT ID):** Acceso unificado con perfil corporativo compatible con todo el ecosistema.

---

## ⚡ Módulos Operativos

| Módulo | Ruta | Funcionalidad |
|---|---|---|
| **Terminal POS** | `/pos` | Interfaz de cobro ultrarrápida a pantalla completa con soporte de lector óptico. |
| **Panel Central** | `/app` | Métricas de ventas en vivo, facturación diaria, estado de cajas y alertas de stock crítico. |
| **Cajas y Turnos** | `/app/cash` | Control estricto de turnos, retiros a caja fuerte y arqueo final. |
| **Catálogo y Stock** | `/app/products` | Gestión de SKU por código de barra, márgenes de ganancia y deducción atómica. |
| **Libro de Ventas** | `/app/sales` | Registro histórico inmutable de tickets, reimpresiones y anulaciones seguras. |
| **Marco Legal & SLA** | `/legal` | Contrato de servicio administrado, SLA 99.9% y política de privacidad. |

---

## 🛠️ Stack Tecnológico

`Next.js 16` • `React 19` • `TypeScript` • `PostgreSQL Serverless (Neon)` • `Prisma ORM` • `Tailwind CSS v4` • `Zod`

---

## ⚙️ Operación & Mantenimiento Interno

```bash
# Mantenimiento y verificación de tipos
npm run typecheck

# Suite de pruebas unitarias (13 tests de cálculo y cobro)
npm test

# Despliegue de migraciones en base de datos cloud
npx prisma db push
```

---

<div align="center">
  <p>© 2026 VOUT Retail · Managed Retail Cloud Infrastructure.</p>
</div>
