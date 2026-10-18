import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeOAuthCode,
  getOAuthRedirectUri,
  getOrCreateOAuthUser,
  normalizeProvider,
} from "@/lib/auth/oauth";
import { createSession } from "@/lib/auth/session";

type Ctx = { params: Promise<{ provider: string }> };

async function handleCallback(request: Request, rawProvider: string) {
  const provider = normalizeProvider(rawProvider);
  if (!provider) {
    return NextResponse.redirect(new URL("/login?oauth_error=invalid_provider", request.url));
  }

  const jar = await cookies();
  const stateCookieName = `oauth_state_${provider}`;
  const storedState = jar.get(stateCookieName)?.value;

  // Clear state cookie
  jar.delete(stateCookieName);

  let code: string | null = null;
  let state: string | null = null;
  let idToken: string | null = null;
  let userJson: string | null = null;
  let error: string | null = null;

  if (request.method === "POST") {
    try {
      const formData = await request.formData();
      code = (formData.get("code") as string) || null;
      state = (formData.get("state") as string) || null;
      idToken = (formData.get("id_token") as string) || null;
      userJson = (formData.get("user") as string) || null;
      error = (formData.get("error") as string) || null;
    } catch {
      return NextResponse.redirect(
        new URL(`/login?oauth_error=invalid_request&provider=${provider}`, request.url)
      );
    }
  } else {
    const url = new URL(request.url);
    code = url.searchParams.get("code");
    state = url.searchParams.get("state");
    idToken = url.searchParams.get("id_token");
    userJson = url.searchParams.get("user");
    error = url.searchParams.get("error");
  }

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?oauth_error=${encodeURIComponent(error)}&provider=${provider}`, request.url)
    );
  }

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL(`/login?oauth_error=invalid_state&provider=${provider}`, request.url)
    );
  }

  if (!code && !idToken) {
    return NextResponse.redirect(
      new URL(`/login?oauth_error=missing_code&provider=${provider}`, request.url)
    );
  }

  try {
    const redirectUri = getOAuthRedirectUri(request, provider);
    const profile = await exchangeOAuthCode(provider, {
      code: code || "",
      redirectUri,
      idToken: idToken || undefined,
      userJson: userJson || undefined,
    });

    if (!profile.email) {
      return NextResponse.redirect(
        new URL(`/login?oauth_error=no_email&provider=${provider}`, request.url)
      );
    }

    const user = await getOrCreateOAuthUser(profile);
    await createSession(user.id);

    return NextResponse.redirect(new URL("/app", request.url));
  } catch (err) {
    console.error(`OAuth callback error (${provider}):`, err);
    return NextResponse.redirect(
      new URL(`/login?oauth_error=auth_failed&provider=${provider}`, request.url)
    );
  }
}

export async function GET(request: Request, { params }: Ctx) {
  const { provider } = await params;
  return handleCallback(request, provider);
}

export async function POST(request: Request, { params }: Ctx) {
  const { provider } = await params;
  return handleCallback(request, provider);
}
