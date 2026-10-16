import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError, authenticateApiKey } from "@/lib/auth/api-auth";
import { toContactDto } from "@/lib/dto";
import { apiContactSchema, firstIssue } from "@/lib/validation";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof Response) return auth;

  const params = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 100);
  const cursor = params.get("cursor");
  const q = params.get("q")?.trim();
  const externalId = params.get("external_id");

  const where: Prisma.ContactWhereInput = {
    organizationId: auth.organizationId,
    ...(externalId ? { externalId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rows = await db.contact.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return NextResponse.json({
    data: page.map(toContactDto),
    next_cursor: hasMore ? page[page.length - 1].id : null,
  });
}

export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof Response) return auth;

  const parsed = apiContactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, "invalid_request", firstIssue(parsed.error));
  const { name, email, phone, company, notes, external_id } = parsed.data;

  try {
    const contact = await db.contact.create({
      data: {
        organizationId: auth.organizationId,
        name,
        email,
        phone: phone ?? null,
        company: company ?? null,
        notes: notes ?? null,
        externalId: external_id ?? null,
      },
    });
    return NextResponse.json({ data: toContactDto(contact) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "conflict", "A contact with that email or external_id already exists.");
    }
    throw error;
  }
}
