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

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);

  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "MEMBER");

  const emailCheck = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailCheck.test(emailRaw)) return fail("Please enter a valid email address.");
  if (roleRaw !== "ADMIN" && roleRaw !== "MEMBER") return fail("Invalid role.");

  // Check if already a member
  const existingUser = await db.user.findUnique({
    where: { email: emailRaw },
    select: {
      id: true,
      memberships: { where: { organizationId: organization.id }, select: { id: true } },
    },
  });

  if (existingUser && existingUser.memberships.length > 0) {
    return fail("This user is already a member of this workspace.");
  }

  const { randomBytes } = await import("node:crypto");
  const { sha256 } = await import("@/lib/ids");
  const { sendMail } = await import("@/lib/mail");
  const { env } = await import("@/lib/env");
  const { escapeHtml } = await import("@/lib/escape-html");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Upsert invitation: delete existing pending for this org+email if any
  await db.invitation.deleteMany({
    where: { organizationId: organization.id, email: emailRaw },
  });

  await db.invitation.create({
    data: {
      id: sha256(token),
      organizationId: organization.id,
      email: emailRaw,
      role: roleRaw,
      expiresAt,
    },
  });

  const inviteUrl = `${env.APP_URL}/invite/${token}`;

  await sendMail({
    to: emailRaw,
    subject: `You've been invited to join ${organization.name}`,
    html: `<p>Hello,</p><p>You have been invited to join <strong>${escapeHtml(organization.name)}</strong> as a <strong>${roleRaw.toLowerCase()}</strong>.</p><p><a href="${inviteUrl}">Click here to accept the invitation</a></p><p>This link expires in 7 days.</p>`,
  });

  refresh();
  return ok(`Invitation sent to ${emailRaw}.`);
}

export async function cancelInvitation(formData: FormData): Promise<ActionResult> {
  const { organization, role } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);

  const invitationId = String(formData.get("invitationId") ?? "").trim();
  if (!invitationId) return fail("Missing invitation id.");

  const deleted = await db.invitation.deleteMany({
    where: { id: invitationId, organizationId: organization.id },
  });

  if (deleted.count === 0) return fail(NOT_FOUND);
  refresh();
  return ok("Invitation cancelled.");
}

export async function updateMemberRole(formData: FormData): Promise<ActionResult> {
  const { organization, role, user } = await requireSession();
  if (role !== "OWNER") return fail("Only the workspace owner can change roles.");

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const newRole = String(formData.get("role") ?? "").trim();
  if (newRole !== "ADMIN" && newRole !== "MEMBER") return fail("Invalid role.");

  const target = await db.membership.findFirst({
    where: { id: membershipId, organizationId: organization.id },
    select: { userId: true, role: true },
  });

  if (!target) return fail("Member not found.");
  if (target.userId === user.id) return fail("You cannot change your own owner role.");
  if (target.role === "OWNER") return fail("Cannot change owner role.");

  await db.membership.update({
    where: { id: membershipId },
    data: { role: newRole as "ADMIN" | "MEMBER" },
  });

  refresh();
  return ok("Role updated.");
}

export async function removeMember(formData: FormData): Promise<ActionResult> {
  const { organization, role, user } = await requireSession();
  if (!canManage(role)) return fail(ONLY_ADMINS);

  const membershipId = String(formData.get("membershipId") ?? "").trim();

  const target = await db.membership.findFirst({
    where: { id: membershipId, organizationId: organization.id },
    select: { userId: true, role: true },
  });

  if (!target) return fail("Member not found.");
  if (target.userId === user.id) return fail("You cannot remove yourself.");
  if (target.role === "OWNER") return fail("Cannot remove the owner.");
  if (role !== "OWNER" && target.role === "ADMIN") {
    return fail("Only the owner can remove administrators.");
  }

  await db.membership.delete({ where: { id: membershipId } });

  refresh();
  return ok("Member removed from workspace.");
}

