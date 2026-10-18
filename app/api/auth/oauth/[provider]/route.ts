import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import {
  getOAuthAuthorizationUrl,
  getOAuthRedirectUri,
  isProviderConfigured,
  normalizeProvider,
} from "@/lib/auth/oauth";

type Ctx = { params: Promise<{ provider: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { provider: rawProvider } = await params;
  const provider = normalizeProvider(rawProvider);

  if (!provider) {
    return NextResponse.redirect(new URL("/login?oauth_error=invalid_provider", request.url));
  }

  if (!isProviderConfigured(provider)) {
    return NextResponse.redirect(
      new URL(`/login?oauth_error=not_configured&provider=${provider}`, request.url)
    );
  }

  const redirectUri = getOAuthRedirectUri(request, provider);
  const state = randomBytes(24).toString("hex");
  const authUrl = getOAuthAuthorizationUrl(provider, redirectUri, state);

  const jar = await cookies();
  jar.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(authUrl);
}
