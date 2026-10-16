import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

// Public ids go in URLs, so they are random and not guessable.
export const newPublicId = () => randomBytes(9).toString("base64url");

export function slugify(value: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "workspace"}-${randomBytes(3).toString("hex")}`;
}

export function generateApiKey() {
  const key = `cs_${randomBytes(24).toString("base64url")}`;
  return { key, prefix: key.slice(0, 10), hash: sha256(key) };
}

export const newWebhookSecret = () => `whsec_${randomBytes(24).toString("base64url")}`;
