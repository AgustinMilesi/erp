import "server-only";
import { env } from "@/lib/env";

export function formatDate(
  date: Date,
  timeZone?: string,
  locale = "es-AR"
) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timeZone || env.APP_TIMEZONE,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date);
  }
}

