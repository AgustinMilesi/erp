"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fail, ok, type ActionResult } from "@/lib/action";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getClientIp } from "@/lib/http";
import { newPublicId, sha256, slugify } from "@/lib/ids";
import { sendMail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/escape-html";
import {
  firstIssue,
  forgotSchema,
  loginSchema,
  registerSchema,
  resetSchema,
} from "@/lib/validation";

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

export async function registerAction(input: unknown): Promise<ActionResult> {
  const ip = await getClientIp();
  if (!(await rateLimit(`register:${ip}`, 5, 60 * 60)).ok) return fail(TOO_MANY);

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { name, organization, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return fail("There is already an account with that email.");
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: organization,
                slug: slugify(organization),
                notifyEmail: email,
                forms: { create: { name: "Website contact form", publicId: newPublicId() } },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    await createSession(user.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("There is already an account with that email.");
    }
    console.error("register failed", error);
    return fail("We couldn't create the account. Please try again.");
  }

  return ok("Welcome aboard.", { redirectTo: "/app" });
}

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { email, password } = parsed.data;

  const ip = await getClientIp();
  const byIp = await rateLimit(`login:ip:${ip}`, 20, 15 * 60);
  const byEmail = await rateLimit(`login:email:${email}`, 8, 15 * 60);
  if (!byIp.ok || !byEmail.ok) return fail(TOO_MANY);

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    await verifyAgainstDummy(password);
    return fail("Incorrect email or password.");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return fail("Incorrect email or password.");
  }

  await createSession(user.id);
  return ok(undefined, { redirectTo: "/app" });
}

export async function guestLoginAction(): Promise<ActionResult> {
  let user = await db.user.findFirst({
    where: {
      memberships: {
        some: {
          organization: {
            products: { some: {} },
          },
        },
      },
    },
    select: { id: true },
  });

  if (!user) {
    user = await db.user.findFirst({ select: { id: true } });
  }

  if (!user) {
    const passwordHash = await hashPassword("GuestDemo2026!");
    user = await db.user.create({
      data: {
        name: "Invitado Demo",
        email: "demo@milesi-erp.com",
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: "Retail Demo Express",
                slug: slugify("Retail Demo Express"),
                notifyEmail: "demo@milesi-erp.com",
                currency: "ARS",
                showDecimals: false,
                timezone: "America/Argentina/Buenos_Aires",
                enabledModules: [
                  "overview",
                  "pos",
                  "sales",
                  "products",
                  "debtors",
                  "expenses",
                  "cash",
                  "settings",
                ],
              },
            },
          },
        },
      },
      select: { id: true },
    });
  }

  await createSession(user.id);
  return ok("Acceso demo activado", { redirectTo: "/app" });
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function acceptInvitationAction(input: unknown): Promise<ActionResult> {
  const ip = await getClientIp();
  if (!(await rateLimit(`accept-invite:${ip}`, 10, 60 * 60)).ok) return fail(TOO_MANY);

  const { acceptInviteSchema } = await import("@/lib/validation");
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { token, name, password } = parsed.data;
  const { sha256 } = await import("@/lib/ids");
  const tokenHash = sha256(token);

  const invite = await db.invitation.findUnique({
    where: { id: tokenHash },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!invite || invite.expiresAt < new Date()) {
    return fail("This invitation link is invalid or has expired.");
  }

  // Check if user already exists
  let existingUser = await db.user.findUnique({
    where: { email: invite.email },
  });

  if (!existingUser) {
    if (!name || !password) {
      return fail("Please enter your name and a password to create your account.");
    }
    const passwordHash = await hashPassword(password);
    existingUser = await db.user.create({
      data: {
        name,
        email: invite.email,
        passwordHash,
      },
    });
  }

  // Create or update membership
  await db.membership.upsert({
    where: {
      userId_organizationId: {
        userId: existingUser.id,
        organizationId: invite.organizationId,
      },
    },
    create: {
      userId: existingUser.id,
      organizationId: invite.organizationId,
      role: invite.role,
    },
    update: {
      role: invite.role,
    },
  });

  // Delete used invitation
  await db.invitation.delete({ where: { id: tokenHash } });

  // Log the user in
  await createSession(existingUser.id);

  return ok("Invitation accepted! Welcome to the team.", { redirectTo: "/app" });
}


export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { email } = parsed.data;

  const ip = await getClientIp();
  const byIp = await rateLimit(`forgot:ip:${ip}`, 5, 60 * 60);
  const byEmail = await rateLimit(`forgot:email:${email}`, 3, 60 * 60);
  if (!byIp.ok || !byEmail.ok) return fail(TOO_MANY);

  // The answer is the same whether or not the account exists.
  const answer = ok("If that email has an account, we've sent a link to reset the password.");

  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) return answer;

  const token = randomBytes(32).toString("base64url");
  await db.passwordReset.deleteMany({ where: { userId: user.id } });
  await db.passwordReset.create({
    data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const link = `${env.APP_URL}/reset-password/${token}`;
  after(() =>
    sendMail({
      to: email,
      subject: "Reset your password",
      html: `
        <p>Hi ${escapeHtml(user.name)},</p>
        <p>Use this link to choose a new password. It works for one hour.</p>
        <p><a href="${link}">${link}</a></p>
        <p>If you didn't ask for this, you can ignore this email.</p>
      `,
    }),
  );

  return answer;
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const ip = await getClientIp();
  if (!(await rateLimit(`reset:ip:${ip}`, 10, 60 * 60)).ok) return fail(TOO_MANY);

  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { token, password } = parsed.data;

  const reset = await db.passwordReset.findUnique({ where: { id: sha256(token) } });
  if (!reset || reset.expiresAt < new Date()) {
    return fail("This link has expired. Ask for a new one.");
  }

  const passwordHash = await hashPassword(password);

  // New password in, every open session and pending link out.
  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: reset.userId } }),
    db.passwordReset.deleteMany({ where: { userId: reset.userId } }),
  ]);

  return ok("Password updated. You can sign in now.", { redirectTo: "/login" });
}
