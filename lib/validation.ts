import { z } from "zod";
import { parseMoney } from "@/lib/money";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("That email doesn't look right")
  .max(254, "That's too long");

const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "That's too long");

const optionalText = (max: number) => z.string().trim().max(max, "That's too long").optional();

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80, "That's too long"),
  organization: z.string().trim().min(2, "Name your company or team").max(80, "That's too long"),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(128, "That's too long"),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z.object({
  token: z.string().min(20).max(100),
  password,
});

// What a visitor sends through a public form
export const publicMessageSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100, "That's too long"),
  email,
  subject: z.string().trim().min(3, "Add a short subject").max(150, "That's too long"),
  message: z
    .string()
    .trim()
    .min(10, "Tell me a bit more, 10 characters minimum")
    .max(5000, "That's too long, 5000 characters max"),
  // Honeypot: people never see it, bots tend to fill it in
  website: z.string().optional(),
});
export type PublicMessageInput = z.infer<typeof publicMessageSchema>;

export const contactSchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Please enter a name").max(120, "That's too long"),
  email,
  phone: optionalText(40),
  company: optionalText(120),
  notes: optionalText(2000),
  externalId: optionalText(100),
});

export const formSchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Give the form a name").max(80, "That's too long"),
  allowedOrigins: z.string().max(2000).optional(),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2, "Please enter a name").max(80, "That's too long"),
  notifyEmail: z.union([email, z.literal("")]).optional(),
  webhookUrl: z.string().trim().max(500, "That's too long").optional(),
  timezone: z.string().trim().min(2).max(100).optional(),
});

export const inviteMemberSchema = z.object({
  email,
  role: z.enum(["ADMIN", "MEMBER"]),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20).max(100),
  name: z.string().trim().min(2, "Please enter your name").max(80, "That's too long").optional(),
  password: password.optional(),
});

export const updateMemberRoleSchema = z.object({
  membershipId: z.string().min(1).max(40),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export const removeMemberSchema = z.object({
  membershipId: z.string().min(1).max(40),
});

export const cancelInvitationSchema = z.object({
  invitationId: z.string().min(1).max(128),
});

export const messageStatusSchema = z.object({
  id: z.string().min(1).max(40),
  status: z.enum(["NEW", "READ", "ARCHIVED"]),
});

export const idSchema = z.object({ id: z.string().min(1).max(40) });

// Bodies accepted by the REST API (snake_case on the outside)
export const apiContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  phone: z.string().trim().max(40).nullish(),
  company: z.string().trim().max(120).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  external_id: z.string().trim().min(1).max(100).nullish(),
});
export const apiContactPatchSchema = apiContactSchema.partial();

export const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Some data is not valid";

export const blankToNull = (value: string | undefined | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

// ---------------------------------------------------------------------------
// Point of sale
// ---------------------------------------------------------------------------

const MAX_CENTS = 1_000_000_000_000; // 10 billion pesos, as cents

// An amount typed in a form, turned into cents. Blank counts as zero when allowed.
const money = (label: string, { allowBlank = false } = {}) =>
  z
    .string()
    .trim()
    .default("")
    .transform((value, ctx) => {
      if (value === "") {
        if (allowBlank) return 0;
        ctx.addIssue({ code: "custom", message: `${label} is required` });
        return z.NEVER;
      }
      const cents = parseMoney(value);
      if (cents === null || cents > MAX_CENTS) {
        ctx.addIssue({ code: "custom", message: `${label} isn't a valid amount` });
        return z.NEVER;
      }
      return cents;
    });

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .default("")
    .transform((value, ctx) => {
      const n = value === "" ? 0 : Number(value);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `${label} has to be a whole number from ${min} to ${max}` });
        return z.NEVER;
      }
      return n;
    });

const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

export const TAX_RATES_BP = [0, 1050, 2100, 2700] as const;
export const CURRENCIES = ["ARS", "USD", "EUR", "BRL", "CLP", "UYU", "MXN", "COP"] as const;

export const categorySchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(1, "Give the category a name").max(60, "That's too long"),
});

export const productSchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Give the product a name").max(120, "That's too long"),
  sku: optionalText(40),
  barcode: optionalText(60),
  categoryId: z.string().max(40).optional(),
  saleType: z.enum(["UNIT", "WEIGHT"]).default("UNIT"),
  size: optionalText(40),
  brand: optionalText(60),
  price: money("The price"),
  cost: money("The cost", { allowBlank: true }),
  taxRateBp: wholeNumber("The tax rate", 0, 10_000).refine(
    (value) => (TAX_RATES_BP as readonly number[]).includes(value),
    "Pick a tax rate from the list",
  ),
  minStock: wholeNumber("The minimum stock", 0, 1_000_000),
  initialStock: wholeNumber("The starting stock", 0, 1_000_000),
  trackStock: checkbox,
});

export const stockAdjustSchema = z
  .object({
    id: z.string().min(1).max(40),
    kind: z.enum(["RESTOCK", "ADJUSTMENT"]),
    quantity: z
      .string()
      .trim()
      .transform((value, ctx) => {
        const n = Number(value);
        if (value === "" || !Number.isInteger(n) || n === 0 || Math.abs(n) > 1_000_000) {
          ctx.addIssue({ code: "custom", message: "Enter a whole number, not zero" });
          return z.NEVER;
        }
        return n;
      }),
    reason: optionalText(200),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "RESTOCK" && value.quantity < 0) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "A restock has to add units" });
    }
    if (value.kind === "ADJUSTMENT" && !value.reason?.trim()) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Say why you're correcting the stock" });
    }
  });

export const openSessionSchema = z.object({
  opening: money("The opening cash", { allowBlank: true }),
  note: optionalText(200),
});

export const closeSessionSchema = z.object({
  id: z.string().min(1).max(40),
  counted: money("The counted cash"),
  note: optionalText(200),
});

export const cashMovementSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  amount: money("The amount").refine((value) => value > 0, "The amount has to be above zero"),
  reason: z.string().trim().min(3, "Say what it was for").max(120, "That's too long"),
});

export const voidSaleSchema = z.object({
  id: z.string().min(1).max(40),
  reason: z.string().trim().min(3, "Say why you're voiding it").max(200, "That's too long"),
});

export const posSettingsSchema = z.object({
  currency: z.enum(CURRENCIES),
  showDecimals: checkbox,
  allowNegativeStock: checkbox,
});

// What the till sends when it charges. Prices are not part of it on purpose:
// the server reads them from the catalog.
export const saleInputSchema = z.object({
  idempotencyKey: z
    .string()
    .min(16)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(40),
        quantity: z.number().positive("Quantity has to be greater than zero").max(100_000),
      }),
    )
    .min(1, "The cart is empty")
    .max(100, "Too many different products in one sale"),
  payments: z
    .array(
      z.object({
        method: z.enum(["CASH", "CARD", "TRANSFER", "OTHER"]),
        amountCents: z.number().int().min(1).max(MAX_CENTS),
      }),
    )
    .min(1, "Add a payment")
    .max(6, "Too many payments"),
  discountCents: z.number().int().min(0).max(MAX_CENTS).default(0),
  expectedTotalCents: z.number().int().min(1).max(MAX_CENTS),
  contactId: z.string().max(40).nullish(),
  debtorId: z.string().max(40).nullish(),
  debtorAmountCents: z.number().int().min(1).max(MAX_CENTS).nullish(),
  note: z.string().trim().max(200).nullish(),
});
export type SaleInput = z.infer<typeof saleInputSchema>;

export const lookupSchema = z.object({ q: z.string().trim().max(100) });
