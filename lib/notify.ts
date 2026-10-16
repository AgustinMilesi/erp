import "server-only";
import { createHmac } from "node:crypto";
import { escapeHtml } from "@/lib/escape-html";
import { sendMail } from "@/lib/mail";
import { env } from "@/lib/env";
import { isSafeWebhookUrl } from "@/lib/url-safety";

type Org = {
  id: string;
  name: string;
  notifyEmail: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
};

type NewMessage = {
  id: string;
  formId: string | null;
  contactId: string | null;
  name: string;
  email: string;
  subject: string;
  body: string;
  createdAt: Date;
};

// Runs after the visitor already got their answer (see `after` in the route).
export async function notifyNewMessage(org: Org, message: NewMessage) {
  const tasks: Promise<unknown>[] = [];

  if (org.notifyEmail) {
    tasks.push(
      sendMail({
        to: org.notifyEmail,
        replyTo: message.email,
        subject: `New message: ${message.subject}`,
        html: `
          <h2>New message for ${escapeHtml(org.name)}</h2>
          <p><strong>Name:</strong> ${escapeHtml(message.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(message.email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(message.subject)}</p>
          <p>${escapeHtml(message.body).replace(/\n/g, "<br>")}</p>
          <p><a href="${env.APP_URL}/app/inbox/${message.id}">Open in your inbox</a></p>
        `,
      }),
    );
  }

  if (org.webhookUrl && org.webhookSecret && isSafeWebhookUrl(org.webhookUrl)) {
    tasks.push(sendWebhook(org.webhookUrl, org.webhookSecret, org.id, message));
  }

  await Promise.allSettled(tasks);
}

async function sendWebhook(url: string, secret: string, organizationId: string, message: NewMessage) {
  const body = JSON.stringify({
    event: "message.created",
    organization_id: organizationId,
    data: {
      id: message.id,
      form_id: message.formId,
      contact_id: message.contactId,
      name: message.name,
      email: message.email,
      subject: message.subject,
      message: message.body,
      created_at: message.createdAt.toISOString(),
    },
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-contact-timestamp": timestamp,
        "x-contact-signature": `sha256=${signature}`,
      },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("[webhook] delivery failed", error);
  }
}
