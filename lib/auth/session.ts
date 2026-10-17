import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/ids";

// The __Host- prefix makes browsers refuse the cookie unless it is Secure,
// has Path=/ and no Domain, so another subdomain can't overwrite it.
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-session" : "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);

  // Only the hash is stored: a leaked database can't be used to impersonate anyone.
  await db.session.create({ data: { id: sha256(token), userId, expiresAt } });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  if (Math.random() < 0.05) {
    void db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  }
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(COOKIE);
}

export type AppSession = {
  user: { id: string; name: string; email: string };
  organization: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    showDecimals: boolean;
    timezone: string;
    enabledModules: string[];
  };
  role: Role;
};

export const getSession = cache(async (): Promise<AppSession | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          memberships: {
            orderBy: { createdAt: "asc" },
            take: 1,
            select: {
              role: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  currency: true,
                  showDecimals: true,
                  timezone: true,
                  enabledModules: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;
  const membership = session.user.memberships[0];
  if (!membership) return null;

  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    organization: membership.organization,
    role: membership.role,
  };
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export const canManage = (role: Role) => role === "OWNER" || role === "ADMIN";
