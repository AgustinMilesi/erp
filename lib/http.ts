import "server-only";
import { headers } from "next/headers";

const pickIp = (forwarded: string | null, real: string | null) =>
  forwarded?.split(",")[0]?.trim() || real || "unknown";

// Inside server actions and server components.
export async function getClientIp() {
  const h = await headers();
  return pickIp(h.get("x-forwarded-for"), h.get("x-real-ip"));
}

// Inside route handlers.
export function getRequestIp(req: Request) {
  return pickIp(req.headers.get("x-forwarded-for"), req.headers.get("x-real-ip"));
}
