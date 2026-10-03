import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isDemo, supabase } from "@/lib/supabase/server";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  if (isDemo()) return NextResponse.redirect(new URL("/settings/gsc?error=demo_mode", origin));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    return NextResponse.redirect(new URL("/settings/gsc?error=google_credentials_missing", origin));

  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const { data: memberships, error } = await db
    .from("workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id)
    .in("role", ["owner", "editor"])
    .limit(1);
  const membership = memberships?.[0];
  if (error || !membership)
    return NextResponse.redirect(new URL("/settings/gsc?error=role_required", origin));

  const state = randomBytes(32).toString("base64url");
  const jar = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax" as const,
    path: "/api/integrations/gsc/callback",
    maxAge: 600,
  };
  jar.set("index_gsc_oauth_state", state, cookieOptions);
  jar.set("index_gsc_workspace", membership.workspace_id, cookieOptions);

  const redirectUri = new URL("/api/integrations/gsc/callback", origin).toString();
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", SCOPE);
  authorize.searchParams.set("access_type", "offline");
  authorize.searchParams.set("include_granted_scopes", "true");
  authorize.searchParams.set("prompt", "consent");
  authorize.searchParams.set("state", state);

  return NextResponse.redirect(authorize);
}
