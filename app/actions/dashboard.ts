"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/action";
import { canManage, requireSession } from "@/lib/auth/session";
import { generateApiKey, newPublicId, newWebhookSecret } from "@/lib/ids";
import { isSafeWebhookUrl, parseOrigins } from "@/lib/url-safety";
import {
  blankToNull,
  contactSchema,
  firstIssue,
  formSchema,
  idSchema,
  messageStatusSchema,
  settingsSchema,
} from "@/lib/validation";

const ONLY_ADMINS = "Only owners and admins can do this.";
const NOT_FOUND = "We couldn't find that item.";

const refresh = () => revalidatePath("/app", "layout");

const isUniqueError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const toObject = (formData: FormData) => Object.fromEntries(formData);

// Every query below filters by organizationId, taken from the session and never
// from the request, so one workspace can't read or touch another one's data.

export async function setMessageStatus(formData: FormData): Promise<ActionResult> {
  const { organization } = await requireSession();
  const parsed = messageStatusSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const result = await db.message.updateMany({
    where: { id: parsed.data.id, organizationId: organization.id },
    data: { status: parsed.data.status },
  });
  if (result.count === 0) return fail(NOT_FOUND);
  refresh();
  return ok("Updated.");
}

export async function saveContact(formData: FormData): Promise<ActionResult> {
  const { organization } = await requireSession();
  const parsed = contactSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { id, name, email, phone, company, notes, externalId } = parsed.data;

  const data = {
    name,
    email,
    phone: blankToNull(phone),
    company: blankToNull(company),
    notes: blankToNull(notes),
    externalId: blankToNull(externalId),
  };

  try {
    if (id) {
      const result = await db.contact.updateMany({
        where: { id, organizationId: organization.id },
        data,
      });
      if (result.count === 0) return fail(NOT_FOUND);
    } else {
      await db.contact.create({ data: { ...data, organizationId: organization.id } });
    }
  } catch (error) {
    if (isUniqueError(error)) return fail("A contact with that email or external id already exists.");
    throw error;
  }

  refresh();
  return ok(id ? "Contact updated." : "Contact added.");
}

export async function deleteContact(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = idSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const result = await db.contact.deleteMany({
    where: { id: parsed.data.id, organizationId: organization.id },
  });
  if (result.count === 0) return fail(NOT_FOUND);
  refresh();
  return ok("Contact deleted.", { redirectTo: "/app/contacts" });
}

export async function saveForm(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = formSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { id, name, allowedOrigins } = parsed.data;

  const origins = parseOrigins(allowedOrigins ?? "");
  if (!origins) return fail("Allowed sites must be full addresses, like https://example.com");

  if (id) {
    const result = await db.form.updateMany({
      where: { id, organizationId: organization.id },
      data: { name, allowedOrigins: origins },
    });
    if (result.count === 0) return fail(NOT_FOUND);
  } else {
    const count = await db.form.count({ where: { organizationId: organization.id } });
    if (count >= 20) return fail("You've reached the limit of 20 forms.");
    await db.form.create({
      data: { name, allowedOrigins: origins, organizationId: organization.id, publicId: newPublicId() },
    });
  }

  refresh();
  return ok(id ? "Form updated." : "Form created.");
}

export async function toggleForm(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = idSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const form = await db.form.findFirst({
    where: { id: parsed.data.id, organizationId: organization.id },
    select: { id: true, active: true },
  });
  if (!form) return fail(NOT_FOUND);

  await db.form.update({ where: { id: form.id }, data: { active: !form.active } });
  refresh();
  return ok(form.active ? "Form paused." : "Form is live again.");
}

export async function deleteForm(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = idSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const result = await db.form.deleteMany({
    where: { id: parsed.data.id, organizationId: organization.id },
  });
  if (result.count === 0) return fail(NOT_FOUND);
  refresh();
  return ok("Form deleted. Its messages stay in your inbox.");
}

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = settingsSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { name, notifyEmail, webhookUrl } = parsed.data;

  const url = blankToNull(webhookUrl);
  if (url && !isSafeWebhookUrl(url)) {
    return fail("The webhook must be a public https address.");
  }

  const current = await db.organization.findUnique({
    where: { id: organization.id },
    select: { webhookSecret: true },
  });

  await db.organization.update({
    where: { id: organization.id },
    data: {
      name,
      notifyEmail: blankToNull(notifyEmail),
      webhookUrl: url,
      webhookSecret: url ? (current?.webhookSecret ?? newWebhookSecret()) : null,
    },
  });
  refresh();
  return ok("Settings saved.");
}

export async function rotateWebhookSecret(): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);

  const result = await db.organization.updateMany({
    where: { id: organization.id, webhookUrl: { not: null } },
    data: { webhookSecret: newWebhookSecret() },
  });
  if (result.count === 0) return fail("Set a webhook address first.");
  refresh();
  return ok("New signing secret generated.");
}

export async function createApiKey(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return fail("Give the key a name (2 to 60 characters).");

  const active = await db.apiKey.count({
    where: { organizationId: organization.id, revokedAt: null },
  });
  if (active >= 10) return fail("You've reached the limit of 10 active keys.");

  const { key, prefix, hash } = generateApiKey();
  await db.apiKey.create({
    data: { organizationId: organization.id, name, prefix, keyHash: hash },
  });
  refresh();
  return ok("Key created. Copy it now, it won't be shown again.", { data: { key } });
}

export async function revokeApiKey(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);
  const parsed = idSchema.safeParse(toObject(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const result = await db.apiKey.updateMany({
    where: { id: parsed.data.id, organizationId: organization.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) return fail(NOT_FOUND);
  refresh();
  return ok("Key revoked.");
}
