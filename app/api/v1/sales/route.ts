import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError, authenticateApiKey } from "@/lib/auth/api-auth";
import { toSaleDto } from "@/lib/dto";

const parseDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof Response) return auth;

  const params = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 100);
  const cursor = params.get("cursor");
  const status = params.get("status");
  const contactId = params.get("contact_id");
  const from = parseDate(params.get("from"));
  const to = parseDate(params.get("to"));

  if (from === undefined || to === undefined) {
    return apiError(400, "invalid_request", "from and to must be dates, like 2026-10-01 or a full ISO timestamp.");
  }
  if (status && status !== "completed" && status !== "voided") {
    return apiError(400, "invalid_request", "status must be completed or voided.");
  }

  const where: Prisma.SaleWhereInput = {
    organizationId: auth.organizationId,
    ...(status ? { status: status === "voided" ? "VOIDED" : "COMPLETED" } : {}),
    ...(contactId ? { contactId } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
  };

  const rows = await db.sale.findMany({
    where,
    include: { items: true, payments: true },
    orderBy: [{ number: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return NextResponse.json({
    data: page.map(toSaleDto),
    next_cursor: hasMore ? page[page.length - 1].id : null,
  });
}
