# Contact

A multi-tenant SaaS to collect your customers' messages in one inbox and keep every contact organized. It is built to be the first module of a bigger platform: the ERP will share its workspaces, users, contacts and API.

## What is inside

- **Accounts and workspaces.** Sign up creates a user, a workspace and a first contact form. Roles: owner, admin, member.
- **Public forms.** Hosted page at `/f/<id>`, embeddable with an iframe, or callable through `POST /api/public/forms/<id>`.
- **Inbox.** Status (new, read, archived), filters, pagination, reply by email.
- **Contacts.** Every sender becomes a contact. Each one has an `external id` field to link it with the ERP.
- **Integrations.** API keys, a REST API (`/api/v1`) and a signed webhook for new messages.
- **Password reset** by email.
- **Point of sale.** Full-screen till at `/pos` with barcode scanning, split payments and printable receipts, plus products, stock, cash register shifts and a sales history. It is the first ERP module, see [Point of sale](#point-of-sale).

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Prisma + PostgreSQL (Neon), Zod, React Hook Form, Resend, Sonner. Same stack and same look as the contact page.

## Run it locally

You need Node 20.9 or newer and a PostgreSQL database (a free [Neon](https://neon.tech) project works).

    npm install
    cp .env.example .env        # on Windows PowerShell: Copy-Item .env.example .env
    # fill DATABASE_URL in .env
    npx prisma migrate dev
    npm run dev

Open http://localhost:3000. Without `RESEND_API_KEY`, emails (like the password reset link) are printed in the terminal.

## Environment variables

| Name | What it is |
|------|------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | Public address of the app, used in emails and embed codes |
| `RESEND_API_KEY` | Key from Resend. Optional in development |
| `EMAIL_FROM` | Sender of the emails |
| `APP_TIMEZONE` | Time zone used to show dates |

## Deploy on Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add the environment variables above (`APP_URL` is your production address).
3. Run `npx prisma migrate deploy` once against the production database.
4. For emails to reach anyone, verify your domain in Resend and update `EMAIL_FROM`.

## Security

- Passwords are hashed with scrypt (N=2^15, r=8, p=3) and compared in constant time. Unknown emails take as long as real ones.
- Sessions are random tokens in an `httpOnly`, `SameSite=Lax`, `Secure` cookie (`__Host-` prefix in production). The database only keeps the SHA-256 of the token.
- Password reset links and API keys are stored hashed too, and a reset closes every open session.
- Rate limits (kept in Postgres, so they work on serverless) on login, sign up, password reset, public forms and the API.
- Every query is filtered by the workspace taken from the session, never from the request.
- All input is validated with Zod on the server. User content is escaped before going into emails.
- Public forms have a honeypot, a body size limit and an optional list of allowed sites.
- Webhook addresses must be public `https` URLs, redirects are not followed, and every call is signed with HMAC.
- Security headers on every page. Only `/f/*` can be embedded in a frame.
- Server actions are protected against CSRF by Next.js (origin check).

## REST API

Create a key in **Settings**. Send it on every request:

    Authorization: Bearer cs_xxxxxxxx

Limit: 120 requests per minute per key. Errors look like `{ "error": { "code": "...", "message": "..." } }`.

| Method | Path | What it does |
|--------|------|--------------|
| GET | `/api/v1/contacts` | List. Query: `limit` (max 100), `cursor`, `q`, `external_id` |
| POST | `/api/v1/contacts` | Create. Body: `name`, `email`, `phone`, `company`, `notes`, `external_id` |
| GET | `/api/v1/contacts/:id` | Read one |
| PATCH | `/api/v1/contacts/:id` | Update any of the fields above |
| GET | `/api/v1/messages` | List. Query: `limit`, `cursor`, `status` (new, read, archived), `contact_id` |
| GET | `/api/v1/products` | List. Query: `limit`, `cursor`, `q`, `sku`, `barcode`, `external_id`, `active` |
| GET | `/api/v1/sales` | List with items and payments. Query: `limit`, `cursor`, `status` (completed, voided), `contact_id`, `from`, `to` |
| GET | `/api/v1/sales/:id` | Read one sale |

Lists return `{ "data": [...], "next_cursor": "..." }`. Send `next_cursor` back as `cursor` to get the next page; it is `null` at the end.

    curl -H "Authorization: Bearer $KEY" "https://your-app.com/api/v1/contacts?limit=20"

    curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
      -d '{"name":"Ana Pérez","email":"ana@example.com","external_id":"CUST-0042"}' \
      https://your-app.com/api/v1/contacts

## Webhook

Set an address in **Settings** and each new message is sent there as `POST` with JSON:

    {
      "event": "message.created",
      "organization_id": "...",
      "data": { "id": "...", "contact_id": "...", "name": "...", "email": "...",
                "subject": "...", "message": "...", "created_at": "..." }
    }

Headers `X-Contact-Timestamp` and `X-Contact-Signature: sha256=<hex>`. The signature is `HMAC-SHA256(secret, timestamp + "." + body)`. Check it like this (Node):

    import { createHmac, timingSafeEqual } from "node:crypto";

    function isValid(rawBody, timestamp, signature, secret) {
      const expected = "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      return a.length === b.length && timingSafeEqual(a, b)
        && Math.abs(Date.now() / 1000 - Number(timestamp)) < 300;
    }

## Point of sale

Open `/pos`. The first time, count the cash in the drawer and open the register; from then on the till is ready. Scan a barcode (or type a SKU or a name) and press Enter, charge, and the sale is saved with its receipt.

How the money and the stock are kept honest:

- **Cents, not decimals.** Every amount is a whole number of cents stored as `BigInt`, so there are no rounding surprises and no overflow with large wholesale totals. Prices include tax, and the tax inside each sale is saved for reports.
- **The server sets the price.** The till only sends product ids and quantities. Prices, tax and the total are read from the catalog inside the transaction, and the sale is refused if the total the cashier saw is no longer the real one.
- **One transaction per sale.** Checking stock, taking it off the shelf, numbering the sale and saving items and payments happen together or not at all. Stock is taken with a conditional update, so two cashiers can't sell the last unit twice. Turn on "let the till sell products that show no stock" in Settings if your counts aren't reliable yet.
- **No double charges.** Every attempt carries a key. If the connection drops and the cashier retries, the same sale comes back instead of a second one.
- **Gap-free numbering.** Sale numbers come from a counter locked inside the transaction.
- **Cash register shifts.** Only one register is open per workspace. Closing it waits for sales in flight and blocks new ones (a fair Postgres advisory lock, so a busy till can't delay it forever), then compares the counted cash with opening cash + cash sales + money put in - money taken out. Money in and out of the drawer is logged with a reason.
- **Voids.** Owners and admins can void a sale while its register is still open. The stock goes back and the movement is recorded. After closing, the cash has been counted, so voiding is blocked.
- **Stock ledger.** Every change (starting stock, restock, correction, sale, void) leaves a movement with who did it, so the shelf count can always be explained.
- **Permissions.** Any member can sell. Products, stock, discounts, voids and settings are for owners and admins.

`npm test` runs the unit tests for the money parser and the totals, tax and payment rules. The transaction rules above were also exercised against a real PostgreSQL with parallel requests: overselling the last unit, repeated keys, numbering under load, voiding twice at once and closing the register in the middle of a rush.

## How the ERP plugs in

- **One workspace model.** `Organization`, `Membership` and `User` are the tenants and logins for the whole platform. New ERP tables just carry an `organizationId`.
- **Contacts are the customers.** `Contact.externalId` is where the ERP stores its own customer id, and the API can search by it. A sale can be linked to a contact from the till.
- **Products and sales are in the same database.** `Product.externalId` links a product with another system, and `/api/v1/products` and `/api/v1/sales` expose both.
- **Two ways to talk.** The ERP can poll the REST API, or react to the webhook.
- **Stable outside shape.** `lib/dto.ts` is the only place that decides what the API returns, so tables can change without breaking integrations.
- **Same rules.** Reuse `requireSession()`, `canManage(role)` and `rateLimit()` in every new module.

## Not included yet

Email verification, two-factor login, billing and plans, and a strict Content-Security-Policy with nonces.

In the point of sale: electronic invoicing (the receipt says it is not a tax invoice), products sold by weight (quantities are whole units), refunds after a register is closed, several registers at the same time, thermal printer support, and purchases and suppliers. Each fits on top of the current structure.

## Scripts

`npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:migrate`, `npm run db:deploy`, `npm run db:studio`.

## License

MIT
