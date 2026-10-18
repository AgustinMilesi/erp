import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { newPublicId, slugify } from "@/lib/ids";

export type OAuthProvider = "google" | "apple" | "microsoft";

export function normalizeProvider(raw: string): OAuthProvider | null {
  const p = raw.toLowerCase().trim();
  if (p === "google") return "google";
  if (p === "apple" || p === "iphone") return "apple";
  if (p === "microsoft" || p === "outlook" || p === "azure") return "microsoft";
  return null;
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  if (provider === "google") {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  if (provider === "microsoft") {
    const clientId =
      process.env.MICROSOFT_CLIENT_ID ||
      process.env.AZURE_AD_CLIENT_ID ||
      process.env.OUTLOOK_CLIENT_ID;
    const clientSecret =
      process.env.MICROSOFT_CLIENT_SECRET ||
      process.env.AZURE_AD_CLIENT_SECRET ||
      process.env.OUTLOOK_CLIENT_SECRET;
    return Boolean(clientId && clientSecret);
  }
  if (provider === "apple") {
    return Boolean(
      process.env.APPLE_CLIENT_ID &&
        (process.env.APPLE_CLIENT_SECRET || process.env.APPLE_PRIVATE_KEY)
    );
  }
  return false;
}

export function getOAuthRedirectUri(req: Request, provider: OAuthProvider): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  let base = process.env.APP_URL;
  if (!base && process.env.VERCEL_URL) {
    base = `https://${process.env.VERCEL_URL}`;
  }
  if (!base && host) {
    base = `${proto}://${host}`;
  }
  if (!base) {
    base = "http://localhost:3000";
  }
  return `${base.replace(/\/+$/, "")}/api/auth/oauth/${provider}/callback`;
}

export function getOAuthAuthorizationUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string
): string {
  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  if (provider === "microsoft") {
    const clientId =
      process.env.MICROSOFT_CLIENT_ID ||
      process.env.AZURE_AD_CLIENT_ID ||
      process.env.OUTLOOK_CLIENT_ID ||
      "";
    const tenant = process.env.MICROSOFT_TENANT_ID || "common";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email User.Read",
      state,
      response_mode: "query",
      prompt: "select_account",
    });
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  if (provider === "apple") {
    const clientId = process.env.APPLE_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code id_token",
      scope: "name email",
      response_mode: "form_post",
      state,
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface OAuthUserProfile {
  email: string;
  name: string;
  provider: OAuthProvider;
  providerId: string;
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  options: {
    code: string;
    redirectUri: string;
    idToken?: string;
    userJson?: string;
  }
): Promise<OAuthUserProfile> {
  const { code, redirectUri, idToken, userJson } = options;

  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google token exchange failed: ${errText}`);
    }

    const data = (await res.json()) as {
      access_token?: string;
      id_token?: string;
    };

    let email = "";
    let name = "";
    let providerId = "";

    if (data.id_token) {
      const payload = decodeJwtPayload(data.id_token);
      if (typeof payload?.email === "string") email = payload.email;
      if (typeof payload?.name === "string") name = payload.name;
      if (typeof payload?.sub === "string") providerId = payload.sub;
    }

    if (!email && data.access_token) {
      const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (userRes.ok) {
        const uInfo = (await userRes.json()) as {
          email?: string;
          name?: string;
          sub?: string;
        };
        if (uInfo.email) email = uInfo.email;
        if (uInfo.name) name = uInfo.name;
        if (uInfo.sub) providerId = uInfo.sub;
      }
    }

    if (!email) throw new Error("Google did not provide an email address");

    return {
      email: email.toLowerCase(),
      name: name || email.split("@")[0],
      provider: "google",
      providerId: providerId || email,
    };
  }

  if (provider === "microsoft") {
    const clientId =
      process.env.MICROSOFT_CLIENT_ID ||
      process.env.AZURE_AD_CLIENT_ID ||
      process.env.OUTLOOK_CLIENT_ID ||
      "";
    const clientSecret =
      process.env.MICROSOFT_CLIENT_SECRET ||
      process.env.AZURE_AD_CLIENT_SECRET ||
      process.env.OUTLOOK_CLIENT_SECRET ||
      "";
    const tenant = process.env.MICROSOFT_TENANT_ID || "common";

    const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Microsoft token exchange failed: ${errText}`);
    }

    const data = (await res.json()) as {
      access_token?: string;
      id_token?: string;
    };

    let email = "";
    let name = "";
    let providerId = "";

    if (data.id_token) {
      const payload = decodeJwtPayload(data.id_token);
      if (typeof payload?.email === "string") email = payload.email;
      else if (typeof payload?.preferred_username === "string") email = payload.preferred_username;
      if (typeof payload?.name === "string") name = payload.name;
      if (typeof payload?.sub === "string") providerId = payload.sub;
    }

    if (data.access_token) {
      const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (meRes.ok) {
        const me = (await meRes.json()) as {
          mail?: string;
          userPrincipalName?: string;
          displayName?: string;
          id?: string;
        };
        email = me.mail || me.userPrincipalName || email;
        name = me.displayName || name;
        if (me.id) providerId = me.id;
      }
    }

    if (!email) throw new Error("Outlook/Microsoft did not provide an email address");

    return {
      email: email.toLowerCase(),
      name: name || email.split("@")[0],
      provider: "microsoft",
      providerId: providerId || email,
    };
  }

  if (provider === "apple") {
    let email = "";
    let name = "";
    let providerId = "";

    // Apple can send id_token in form_post directly
    if (idToken) {
      const payload = decodeJwtPayload(idToken);
      if (typeof payload?.email === "string") email = payload.email;
      if (typeof payload?.sub === "string") providerId = payload.sub;
    }

    // First time sign-in passes user: {"name":{"firstName":"...","lastName":"..."}}
    if (userJson) {
      try {
        const parsed = JSON.parse(userJson) as {
          name?: { firstName?: string; lastName?: string };
        };
        const first = parsed.name?.firstName || "";
        const last = parsed.name?.lastName || "";
        const fullName = `${first} ${last}`.trim();
        if (fullName) name = fullName;
      } catch {
        // ignore parse error
      }
    }

    // If client_secret is configured and code is present, exchange at Apple token endpoint
    const clientSecret = process.env.APPLE_CLIENT_SECRET;
    const clientId = process.env.APPLE_CLIENT_ID || "";
    if (code && clientSecret) {
      const res = await fetch("https://appleid.apple.com/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id_token?: string };
        if (data.id_token) {
          const payload = decodeJwtPayload(data.id_token);
          if (typeof payload?.email === "string") email = payload.email;
          if (typeof payload?.sub === "string") providerId = payload.sub;
        }
      }
    }

    if (!email) throw new Error("Apple did not return an email address");

    return {
      email: email.toLowerCase(),
      name: name || email.split("@")[0],
      provider: "apple",
      providerId: providerId || email,
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export async function getOrCreateOAuthUser(profile: OAuthUserProfile) {
  const email = profile.email.toLowerCase().trim();

  const existing = await db.user.findUnique({
    where: { email },
    include: { memberships: { take: 1 } },
  });

  if (existing) {
    // If the user existed without an organization, guarantee they have one
    if (existing.memberships.length === 0) {
      const orgName = `${existing.name || "Mi"}'s Comercio`;
      await db.membership.create({
        data: {
          role: "OWNER",
          user: { connect: { id: existing.id } },
          organization: {
            create: {
              name: orgName,
              slug: slugify(orgName),
              notifyEmail: email,
              currency: "ARS",
              forms: { create: { name: "Website contact form", publicId: newPublicId() } },
            },
          },
        },
      });
    }
    return existing;
  }

  const name = profile.name?.trim() || email.split("@")[0];
  const orgName = `${name}'s Comercio`;
  const randomPass = randomBytes(32).toString("hex");
  const passwordHash = await hashPassword(randomPass);

  const newUser = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          organization: {
            create: {
              name: orgName,
              slug: slugify(orgName),
              notifyEmail: email,
              currency: "ARS",
              forms: { create: { name: "Website contact form", publicId: newPublicId() } },
            },
          },
        },
      },
    },
  });

  return newUser;
}
