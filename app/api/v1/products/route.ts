import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/auth/api-auth";
import { toProductDto } from "@/lib/dto";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof Response) return auth;

  const params = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 100);
  const cursor = params.get("cursor");
  const q = params.get("q")?.trim();
  const sku = params.get("sku");
  const barcode = params.get("barcode");
  const externalId = params.get("external_id");
  const active = params.get("active");

  const where: Prisma.ProductWhereInput = {
    organizationId: auth.organizationId,
    ...(sku ? { sku } : {}),
    ...(barcode ? { barcode } : {}),
    ...(externalId ? { externalId } : {}),
    ...(active === "true" ? { active: true } : active === "false" ? { active: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rows = await db.product.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return NextResponse.json({
    data: page.map(toProductDto),
    next_cursor: hasMore ? page[page.length - 1].id : null,
  });
}
