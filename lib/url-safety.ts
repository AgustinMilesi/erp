// Webhook URLs are typed in by users and fetched by our server, so we refuse
// anything that points at the local machine or a private network.
export function isSafeWebhookUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  if (host.startsWith("[")) return false; // IPv6 literals
  if (host === "localhost" || /\.(localhost|local|internal|lan)$/.test(host)) return false;

  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    const isPrivate =
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127);
    return !isPrivate;
  }

  return host.includes(".");
}

// Allowed origins for the public form API, written as scheme://host[:port]
export function parseOrigins(text: string): string[] | null {
  const items = text
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const origins: string[] = [];
  for (const item of items) {
    try {
      const url = new URL(item);
      if (!["http:", "https:"].includes(url.protocol)) return null;
      origins.push(url.origin);
    } catch {
      return null;
    }
  }
  return [...new Set(origins)].slice(0, 20);
}
