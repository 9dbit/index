import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const allowed = [
    "sites",
    "registry",
    "network",
    "content",
    "proposals",
    "keywords",
    "backlinks",
    "performance",
    "seo-health",
    "alerts",
    "reports",
    "settings",
    "login",
    "api",
  ];
  if (parts[0] && !allowed.includes(parts[0]))
    return new NextResponse("Not found", { status: 404 });
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (process.env.INDEX_DEMO_MODE === "true") return response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const publicRoute =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/api/health";
  if (!url || !key) {
    if (publicRoute) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  const { data, error } = await client.auth.getUser();
  if ((error || !data.user) && !publicRoute) {
    const res = request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Authentication required" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  }
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|previews/).*)"],
};
