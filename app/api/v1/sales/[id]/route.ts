import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, authenticateApiKey } from "@/lib/auth/api-auth";
import { toSaleDto } from "@/lib/dto";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const sale = await db.sale.findFirst({
    where: { id, organizationId: auth.organizationId },
    include: { items: true, payments: true },
  });
  if (!sale) return apiError(404, "not_found", "No sale with that id.");

  return NextResponse.json({ data: toSaleDto(sale) });
}
