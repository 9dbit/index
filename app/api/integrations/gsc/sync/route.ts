import { isDemo, supabase } from "@/lib/supabase/server";

export async function POST() {
  if (isDemo())
    return Response.json(
      { status: "blocked", reason: "demo_mode", synced_rows: 0 },
      { status: 409 },
    );

  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships, error: membershipError } = await db
    .from("workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id)
    .in("role", ["owner", "editor"])
    .limit(1);
  if (membershipError)
    return Response.json({ error: membershipError.message }, { status: 500 });
  const membership = memberships?.[0];
  if (!membership)
    return Response.json({ error: "Owner or editor role required" }, { status: 403 });

  const {
    data: { session },
  } = await db.auth.getSession();
  if (!session?.access_token)
    return Response.json({ error: "Authentication session unavailable" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl)
    return Response.json({ error: "Supabase URL unavailable" }, { status: 500 });

  const response = await fetch(`${supabaseUrl}/functions/v1/gsc-sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workspace_id: membership.workspace_id, days: 30 }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({ error: "Invalid sync response" }));
  return Response.json(body, { status: response.status });
}
