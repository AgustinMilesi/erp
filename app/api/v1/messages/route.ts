import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/auth/api-auth";
import { toMessageDto } from "@/lib/dto";

const STATUSES = ["NEW", "READ", "ARCHIVED"] as const;

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof Response) return auth;

  const params = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 100);
  const cursor = params.get("cursor");
  const status = params.get("status")?.toUpperCase();
  const contactId = params.get("contact_id");

  const where: Prisma.MessageWhereInput = {
    organizationId: auth.organizationId,
    ...(status && (STATUSES as readonly string[]).includes(status)
      ? { status: status as (typeof STATUSES)[number] }
      : {}),
    ...(contactId ? { contactId } : {}),
  };

  const rows = await db.message.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return NextResponse.json({
    data: page.map(toMessageDto),
    next_cursor: hasMore ? page[page.length - 1].id : null,
  });
}
