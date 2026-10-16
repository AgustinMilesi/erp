import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/ids";
import { rateLimit } from "@/lib/rate-limit";

export const apiError = (status: number, code: string, message: string, headers?: HeadersInit) =>
  NextResponse.json({ error: { code, message } }, { status, headers });

// Returns the organization the key belongs to, or a ready-made error response.
export async function authenticateApiKey(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length > 200) {
    return apiError(401, "unauthorized", "Send your API key as: Authorization: Bearer <key>");
  }

  const key = await db.apiKey.findUnique({ where: { keyHash: sha256(token) } });
  if (!key || key.revokedAt) {
    return apiError(401, "unauthorized", "That API key is not valid.");
  }

  const limit = await rateLimit(`apikey:${key.id}`, 120, 60);
  if (!limit.ok) {
    return apiError(429, "rate_limited", "Too many requests.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const stale = !key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000;
  if (stale) {
    void db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }

  return { organizationId: key.organizationId };
}
