# 💳 Retail Engine & Point of Sale (POS)

Sistema de gestión comercial y punto de venta (**POS**) de alto rendimiento en la nube. Diseñado para operaciones minoristas exigentes: cobro ultra veloz con lector de código de barras, turnos y arqueos ciegos de caja, inventario atómico sin riesgo de sobreventas e impresión de tickets térmicos.

<p align="left">
  <a href="https://milesi-erp.vercel.app"><img src="https://img.shields.io/badge/Demo%20en%20Vivo-milesi--erp.vercel.app-f43f5e?style=for-the-badge&logo=vercel" alt="Live Demo" /></a>
  <a href="https://milesi-erp.vercel.app/demo"><img src="https://img.shields.io/badge/Acceso%20Demo%201--Click-Invitado-10b981?style=for-the-badge&logo=shield" alt="1-Click Demo" /></a>
  <img src="https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.3-20232a?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-00E599?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
</p>

---

## 🎯 ¿Para qué sirve?

- **Operación en caja sin demoras**: Terminal de cobro pensada para teclado físico o escáner de barras, con soporte para pagos mixtos (efectivo, transferencia, tarjeta) y cálculo exacto de cambio.
- **Control financiero estricto**: No permite ventas sin un turno de caja abierto. Al cerrar el turno, el cajero realiza un arqueo ciego y el sistema audita faltantes o sobrantes de forma automática.
- **Inventario consistente y transaccional**: Deducciones de stock inmediatas en base de datos bajo transacciones atómicas seguras (`BigInt` en centavos para eliminar errores de redondeo de punto flotante).
- **Emisión de tickets térmicos**: Recibos listos para imprimir en impresoras térmicas comerciales estándar de 58mm y 80mm.
- **Importador de catálogos**: Carga masiva de artículos y listas de precios desde planillas Excel (`.xlsx`, `.xls`) o backups JSON.

---

## ✨ Módulos Principales

| Módulo | Ruta | Funcionalidad |
|---|---|---|
| **Punto de Venta (POS)** | `/pos` | Terminal de cobro pantalla completa, atajos de teclado, búsqueda y división de pagos. |
| **Panel de Control** | `/app` | Métricas en vivo de ventas diarias, estado de caja, alertas de stock bajo y tickets recientes. |
| **Turnos y Arqueos de Caja** | `/app/cash` | Apertura con fondo inicial, registro de retiros/ingresos y conciliación ciega de cierre. |
| **Productos y Stock** | `/app/products` | Gestión de catálogo, códigos de barra, costos, precios de venta y control de inventario. |
| **Historial de Ventas** | `/app/sales` | Auditoría de comprobantes emitidos, reimpresión y anulación con reintegro automático a stock. |
| **Clientes y Cuenta Corriente** | `/app/contacts` | Padrón de clientes y seguimiento de saldos y créditos. |

---

## 🛠️ Stack Tecnológico

- **Frontend & Backend**: Next.js 16 (App Router, Server Actions) + React 19
- **Lenguaje**: TypeScript (tipado estricto extremo)
- **Estilos**: Tailwind CSS 4 (soporte de temas cromáticos, modo oscuro y claro)
- **Base de Datos**: PostgreSQL Serverless en Neon
- **ORM**: Prisma ORM con pooler PgBouncer
- **Validaciones**: Zod (esquemas de cobro, productos y migraciones)
- **Motor Excel**: SheetJS (XLSX) para importaciones de catálogo
- **Internacionalización**: Multilingüe nativo (Español, Inglés, Portugués, Chino)

---

## ⚡ Prueba Rápida (Sin Registro)

Podés probar el sistema completo en producción con **1-Click**:
- **[Entrar como Invitado en Modo Demo](https://milesi-erp.vercel.app/demo)** (ingresa directo a `/app` con caja y productos cargados).
- O desde la pantalla de login en [milesi-erp.vercel.app/login](https://milesi-erp.vercel.app/login) tocando **"Entrar como Invitado"**.

---

## 🚀 Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/AgustinMilesi/retail.git
cd retail

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env

# 4. Generar cliente Prisma y correr
npx prisma generate
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

### 🔗 Otros Proyectos
- [📥 Customer Inbox SaaS](https://github.com/AgustinMilesi/inbox) — Bandeja de entrada multi-inquilino y formularios embebibles.
- [🌐 OneCargo Logistics](https://github.com/AgustinMilesi/cargo) — Sistema operativo de fletes internacionales y aduana.
- [📬 Contact Portal](https://github.com/AgustinMilesi/contact) — Portal de contacto y captura de leads con validación Zod.
