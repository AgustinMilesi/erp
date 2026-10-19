import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("to") === "pos" ? "/pos" : "/app";

  // Find user whose organization has products (rich demo experience)
  let user = await db.user.findFirst({
    where: {
      memberships: {
        some: {
          organization: {
            products: { some: {} },
          },
        },
      },
    },
    select: { id: true },
  });

  if (!user) {
    user = await db.user.findFirst({ select: { id: true } });
  }

  if (!user) {
    const { hashPassword } = await import("@/lib/auth/password");
    const { slugify } = await import("@/lib/ids");
    const passwordHash = await hashPassword("GuestDemo2026!");
    user = await db.user.create({
      data: {
        name: "Invitado Demo",
        email: "demo@milesi-erp.com",
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: "Retail Demo Express",
                slug: slugify("Retail Demo Express"),
                notifyEmail: "demo@milesi-erp.com",
                currency: "ARS",
                showDecimals: false,
                timezone: "America/Argentina/Buenos_Aires",
                enabledModules: [
                  "overview",
                  "pos",
                  "sales",
                  "products",
                  "debtors",
                  "expenses",
                  "cash",
                  "settings",
                ],
              },
            },
          },
        },
      },
      select: { id: true },
    });
  }

  await createSession(user.id);

  const url = new URL(target, request.url);
  return NextResponse.redirect(url);
}
