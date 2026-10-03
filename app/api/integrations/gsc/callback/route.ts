import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isDemo, supabase } from "@/lib/supabase/server";

function settings(origin: string, params: Record<string, string>) {
  const url = new URL("/settings/gsc", origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  if (isDemo()) return NextResponse.redirect(settings(origin, { error: "demo_mode" }));

  const requestUrl = new URL(request.url);
  const oauthError = requestUrl.searchParams.get("error");
  if (oauthError)
    return NextResponse.redirect(settings(origin, { error: `google_${oauthError}` }));

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const jar = await cookies();
  const expectedState = jar.get("index_gsc_oauth_state")?.value;
  const workspaceId = jar.get("index_gsc_workspace")?.value;
  jar.delete("index_gsc_oauth_state");
  jar.delete("index_gsc_workspace");

  if (!code || !state || !expectedState || state !== expectedState || !workspaceId)
    return NextResponse.redirect(settings(origin, { error: "oauth_state_invalid" }));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    return NextResponse.redirect(settings(origin, { error: "google_credentials_missing" }));

  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const { data: membership, error: membershipError } = await db
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .in("role", ["owner", "editor"])
    .maybeSingle();
  if (membershipError || !membership)
    return NextResponse.redirect(settings(origin, { error: "role_required" }));

  const redirectUri = new URL("/api/integrations/gsc/callback", origin).toString();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  const tokens = (await tokenResponse.json().catch(() => ({}))) as TokenResponse;
  if (!tokenResponse.ok || !tokens.refresh_token)
    return NextResponse.redirect(
      settings(origin, {
        error: tokens.refresh_token ? "token_exchange_failed" : "refresh_token_missing",
      }),
    );

  const { error: storeError } = await db.rpc("store_gsc_credentials", {
    p_workspace_id: workspaceId,
    p_client_id: clientId,
    p_client_secret: clientSecret,
    p_refresh_token: tokens.refresh_token,
  });
  if (storeError)
    return NextResponse.redirect(settings(origin, { error: "credential_store_failed" }));

  return NextResponse.redirect(settings(origin, { connected: "1" }));
}
