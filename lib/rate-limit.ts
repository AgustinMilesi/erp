import "server-only";
import { db } from "@/lib/db";

// Fixed-window counter stored in Postgres. One atomic statement per hit,
// so it behaves the same with many serverless instances running at once.
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, (NOW() AT TIME ZONE 'UTC') + (${windowSeconds}::int * INTERVAL '1 second'))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."resetAt" <= (NOW() AT TIME ZONE 'UTC') THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" <= (NOW() AT TIME ZONE 'UTC')
          THEN (NOW() AT TIME ZONE 'UTC') + (${windowSeconds}::int * INTERVAL '1 second')
        ELSE "RateLimit"."resetAt"
      END
    RETURNING "count", "resetAt"`;

  // Now and then, sweep rows that already expired.
  if (Math.random() < 0.01) {
    void db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {});
  }

  const row = rows[0];
  const retryAfter = Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000));
  return { ok: Number(row.count) <= limit, retryAfter };
}
