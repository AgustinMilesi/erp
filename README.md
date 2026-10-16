# ERP & POS Engine

Un sistema integral de gestión empresarial y punto de venta minorista (**POS**) diseñado para operar con máxima velocidad, alta concurrencia y tolerancia cero a errores de inventario o dinero.

Desarrollado como una plataforma **multi-tenant**, permite a diferentes empresas y sucursales gestionar sus ventas, stock, cajas registradoras, equipo de cajeros y clientes en un entorno seguro y en la nube.

Demo en producción: [milesi-erp.vercel.app](https://milesi-erp.vercel.app)

---

## 🎯 ¿Qué resuelve este sistema?

Muchos comercios sufren desfasajes de caja, cobros duplicados por caídas de internet o diferencias de stock entre lo que figura en el sistema y lo que hay en góndola. Este software está diseñado para blindar la operación comercial:

- **Punto de Venta veloz:** Diseñado para teclado y lector de código de barras. Permite cobrar en efectivo, tarjeta, transferencia bancaria o pagos divididos (*split payments*) calculando el vuelto al instante.
- **Control estricto de caja (Turnos):** Las ventas solo ocurren si hay una caja abierta. Al cerrar el turno, el sistema compara el dinero físico contado con lo esperado según las ventas y movimientos registrados, auditando sobrantes o faltantes.
- **Control de inventario en tiempo real:** Cada venta descuenta el stock de inmediato. Si dos cajeros intentan vender la última unidad al mismo segundo, el sistema garantiza que solo uno pueda concretarla, evitando sobreventas.
- **Auditoría total (Libro de movimientos):** Cada cambio en el stock (ingreso de mercadería, ajuste manual, venta o anulación) queda asentado con fecha, hora y responsable.
- **Equipo y Roles:** Permite invitar administradores y cajeros con permisos diferenciados mediante enlaces de invitación seguros.
- **Tickets e Impresión Térmica:** Emisión de comprobantes listos para imprimir en impresoras térmicas de 80mm y 58mm (Epson, Hasar, mini POS, etc.).

---

## 🏢 Módulos Principales

| Módulo | Descripción |
|---|---|
| **Centro de Control (Dashboard)** | Visión en tiempo real de ingresos del día, cantidad de ventas, alertas de stock bajo y estado de la caja registradora. |
| **Terminal de Cobro (`/pos`)** | Interfaz de pantalla completa para venta rápida, búsqueda de productos por código de barras/nombre y asociación de clientes. |
| **Gestión de Stock y Catálogo** | Catálogo de productos con SKU, códigos de barra, precios, costos, categorías e historial de movimientos. |
| **Arqueo y Cierres de Caja** | Apertura con fondo inicial, registro de ingresos/retiros de dinero con motivo y cierre de turno con cálculo de diferencias. |
| **Historial de Ventas y Anulaciones** | Consulta de tickets emitidos, detalle de pagos y posibilidad de anular ventas reincorporando el stock automáticamente (solo con turno abierto). |
| **Equipo y Sucursales** | Gestión de miembros del equipo con roles: `Dueño (Owner)`, `Administrador (Admin)` y `Cajero (Member)`. |
| **API REST & Integraciones** | Claves de API (`API Keys`) para conectar lectores externos, carritos web u otros sistemas de facturación. |

---

## 🛡️ Confiabilidad y Seguridad Comercial

Para que los números de un negocio sean de fiar, el sistema aplica reglas estrictas:

1. **Dinero exacto en centavos (Sin errores de redondeo):** Todos los montos se almacenan internamente como números enteros de centavos (`BigInt`), evitando los clásicos errores de cálculo con decimales flotantes.
2. **El servidor manda:** La pantalla de cobro solo envía cantidades y productos. Los precios reales se leen y validan en el servidor al momento exacto de cerrar la venta.
3. **Todo o nada (Transacciones atómicas):** Comprobar stock, descontarlo, numerar la venta correlativamente y registrar el pago ocurren en una sola operación protegida. Si se corta la conexión a mitad de camino, nada se guarda y nada se descuenta erróneamente.
4. **Cero cobros dobles (Idempotencia):** Cada intento de cobro lleva un identificador único. Si se interrumpe la red y el cajero reintenta, el sistema reconoce la venta original y no la cobra dos veces.
5. **Numeración correlativa sin saltos:** Los números de ticket nunca se repiten ni dejan huecos vacíos.
6. **Seguridad de datos:** Contraseñas protegidas mediante algoritmos de derivación avanzados (*scrypt*), sesiones seguras en cookies con tokens hasheados (un volcado de la base de datos no expone sesiones activas) y límites de intentos para evitar ataques.

---

## 💻 Puesta en Marcha (Desarrollo Local)

Para desarrolladores o administradores de sistemas que deseen correr el proyecto en su máquina:

### Requisitos:
- **Node.js** v20.9 o superior.
- Base de datos **PostgreSQL** (se recomienda un proyecto gratuito en [Neon](https://neon.tech)).

### Pasos:

```bash
# 1. Clonar el repositorio
git clone https://github.com/AgustinMilesi/erp.git
cd erp

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Aplicar las migraciones en la base de datos
npx prisma migrate dev

# 5. Iniciar el servidor local
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## ⚙️ Variables de Entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL (con pooling recomendado para la app). |
| `DIRECT_URL` | Conexión directa a PostgreSQL para migraciones de Prisma. |
| `APP_URL` | URL pública de la aplicación (ej: `https://milesi-erp.vercel.app`). |
| `APP_TIMEZONE` | Zona horaria del negocio para registro de turnos y comprobantes (ej: `America/Argentina/Buenos_Aires`). |
| `RESEND_API_KEY` | *(Opcional)* Clave de [Resend](https://resend.com) para envío de invitaciones y recuperación de contraseñas por email. |
| `EMAIL_FROM` | Dirección y remitente de los correos enviados. |

---

## 🔌 API REST para Desarrolladores

El sistema expone endpoints seguros mediante autenticación Bearer (`Authorization: Bearer cs_xxxx`):

- `GET /api/v1/products`: Listado y búsqueda de productos.
- `GET /api/v1/sales`: Historial paginado de ventas con ítems y medios de pago.
- `GET /api/v1/contacts`: Directorio de clientes vinculados.
- `POST /api/v1/contacts`: Alta de clientes desde plataformas externas.

---

## 🛠️ Stack Tecnológico

- **Frontend & Backend:** Next.js 16 (App Router con Turbopack) + React 19.
- **Tipado & Lógica:** TypeScript 5 en modo estricto.
- **Estilos:** Tailwind CSS 4 con diseño oscuro minimalista.
- **Base de Datos & ORM:** PostgreSQL en Neon + Prisma ORM.
- **Validaciones:** Zod + React Hook Form.
- **Correos:** Resend.
- **Notificaciones:** Sonner.

---

## 📄 Licencia

Este proyecto está bajo licencia [MIT](LICENSE).
