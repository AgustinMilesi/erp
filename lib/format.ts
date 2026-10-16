import "server-only";
import { env } from "@/lib/env";

const formatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: env.APP_TIMEZONE,
});

export const formatDate = (date: Date) => formatter.format(date);
