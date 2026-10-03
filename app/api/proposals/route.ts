import { isDemo, supabase } from "@/lib/supabase/server";
import { proposalInput } from "@/lib/proposal-input";

export async function POST(req: Request) {
  if (isDemo())
    return Response.json(
      { error: "Proposal persistence is disabled in demo mode." },
      { status: 403 },
    );

  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = proposalInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid proposal" },
      { status: 400 },
    );

  const { data: site, error: siteError } = await db
    .from("sites")
    .select("id,workspace_id")
    .eq("id", parsed.data.site_id)
    .single();
  if (siteError || !site)
    return Response.json({ error: "Website unavailable" }, { status: 404 });

  const { data, error } = await db
    .from("proposals")
    .insert({
      workspace_id: site.workspace_id,
      site_id: site.id,
      title: parsed.data.title,
      rationale: parsed.data.rationale,
      target_keyword: parsed.data.target_keyword || null,
      evidence: {
        basis: "manual",
        note: "Submitted by a workspace member. No automated metric claim is attached.",
      },
      source: "manual",
      fingerprint: null,
      status: "proposed",
      created_by: user.id,
    })
    .select()
    .single();

  return Response.json(
    error ? { error: "Could not create proposal." } : data,
    { status: error ? 403 : 201 },
  );
}
