import { isDemo, supabase } from "@/lib/supabase/server";

export async function POST() {
  if (isDemo())
    return Response.json(
      { status: "blocked", reason: "demo_mode", created: 0 },
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
    return Response.json(
      { error: "Owner or editor role required" },
      { status: 403 },
    );

  const { data, error } = await db.rpc("generate_gsc_proposals", {
    p_workspace_id: membership.workspace_id,
  });

  if (error)
    return Response.json(
      { error: "Analysis could not run", detail: error.message },
      { status: 500 },
    );

  return Response.json(data ?? { status: "ok", created: 0 });
}
