import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

let client: Resend | null = null;

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[mail] RESEND_API_KEY is empty, so this email was not sent.\nTo: ${input.to}\nSubject: ${input.subject}\n${input.html}\n`);
    } else {
      console.warn("[mail] RESEND_API_KEY is missing: email not sent");
    }
    return;
  }
  try {
    client ??= new Resend(env.RESEND_API_KEY);
    const { error } = await client.emails.send({ from: env.EMAIL_FROM, ...input });
    if (error) console.error("[mail] Resend could not send the email", error);
  } catch (error) {
    console.error("[mail] Resend request failed", error);
  }
}
