import "server-only";
import { z } from "zod";

const schema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Contact <onboarding@resend.dev>"),
  APP_TIMEZONE: z.string().default("America/Argentina/Buenos_Aires"),
});

const parsed = schema.parse(process.env);

export const env = {
  ...parsed,
  APP_URL: parsed.APP_URL.replace(/\/+$/, ""),
};
