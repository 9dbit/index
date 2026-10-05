import { isDemo, supabase } from "@/lib/supabase/server";
import { networkEdgeInput } from "@/lib/network-input";

async function workspace(db: Awaited<ReturnType<typeof supabase>>) {
  const { data } = await db.from("workspaces").select("id").order("created_at").limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function POST(req: Request) {
  if (isDemo()) return Response.json({ error: "Demo writes are disabled" }, { status: 403 });
  const db = await supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = networkEdgeInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const workspaceId = await workspace(db);
  if (!workspaceId) return Response.json({ error: "No workspace assigned" }, { status: 403 });

  const { data: sites, error: siteError } = await db
    .from("sites")
    .select("id,tier")
    .eq("workspace_id", workspaceId)
    .in("id", [parsed.data.source_site_id, parsed.data.target_site_id]);
  if (siteError || !sites || sites.length !== 2)
    return Response.json({ error: "Both websites must exist in this workspace" }, { status: 400 });
  const source = sites.find((site) => site.id === parsed.data.source_site_id);
  const target = sites.find((site) => site.id === parsed.data.target_site_id);
  if (!source || !target || source.tier !== target.tier + 1)
    return Response.json(
      { error: "Network links must flow one tier toward Tier 1 (Tier 3 → Tier 2 or Tier 2 → Tier 1)." },
      { status: 400 },
    );

  const { data, error } = await db
    .from("site_network_edges")
    .insert({ ...parsed.data, workspace_id: workspaceId })
    .select()
    .single();
  if (error)
    return Response.json(
      { error: error.code === "23505" ? "This support relationship already exists." : "Could not create network relationship." },
      { status: 400 },
    );
  return Response.json(data, { status: 201 });
}

export async function DELETE(req: Request) {
  if (isDemo()) return Response.json({ error: "Demo writes are disabled" }, { status: 403 });
  const db = await supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return Response.json({ error: "Relationship id is required" }, { status: 400 });
  const workspaceId = await workspace(db);
  if (!workspaceId) return Response.json({ error: "No workspace assigned" }, { status: 403 });
  const { error } = await db.from("site_network_edges").delete().eq("workspace_id", workspaceId).eq("id", body.id);
  return Response.json(error ? { error: "Could not remove relationship." } : { id: body.id }, { status: error ? 400 : 200 });
}
