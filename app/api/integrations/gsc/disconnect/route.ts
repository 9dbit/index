import { isDemo, supabase } from "@/lib/supabase/server";

export async function POST() {
  if (isDemo())
    return Response.json({ error: "Disabled in demo mode" }, { status: 409 });

  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships, error: membershipError } = await db
    .from("workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1);
  if (membershipError)
    return Response.json({ error: membershipError.message }, { status: 500 });
  const membership = memberships?.[0];
  if (!membership)
    return Response.json({ error: "Owner role required" }, { status: 403 });

  const { error } = await db.rpc("disconnect_gsc", {
    p_workspace_id: membership.workspace_id,
  });
  if (error)
    return Response.json({ error: "Could not disconnect Search Console" }, { status: 500 });

  return Response.json({ status: "ok", disconnected: true });
}
