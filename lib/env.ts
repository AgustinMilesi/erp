import "server-only";
import { z } from "zod";

function getBaseUrl(): string {
  if (process.env.APP_URL) {
    const raw = process.env.APP_URL.trim();
    if (!/^https?:\/\//i.test(raw)) {
      return `https://${raw}`;
    }
    return raw;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "http://localhost:3000";
}

const schema = z.object({
  APP_URL: z.string().url(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("ERP <onboarding@resend.dev>"),
  APP_TIMEZONE: z.string().default("America/Argentina/Buenos_Aires"),
  // OAuth credentials (optional until configured)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
});

const parsed = schema.parse({
  ...process.env,
  APP_URL: getBaseUrl(),
});

export const env = {
  ...parsed,
  APP_URL: parsed.APP_URL.replace(/\/+$/, ""),
};
