import { isDemo, supabase } from "@/lib/supabase/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (isDemo())
    return Response.json(
      { error: "Draft creation is disabled in demo mode." },
      { status: 403 },
    );

  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: proposal, error: proposalError } = await db
    .from("proposals")
    .select("id,workspace_id,site_id,title,target_keyword,status")
    .eq("id", id)
    .single();

  if (proposalError || !proposal)
    return Response.json({ error: "Proposal unavailable" }, { status: 404 });
  if (proposal.status !== "approved")
    return Response.json(
      { error: "Only an approved proposal can become a draft." },
      { status: 409 },
    );

  const { data, error } = await db
    .from("content_items")
    .insert({
      workspace_id: proposal.workspace_id,
      site_id: proposal.site_id,
      proposal_id: proposal.id,
      topic: proposal.title,
      keyword: proposal.target_keyword,
      state: "Draft",
    })
    .select()
    .single();

  if (error) {
    const duplicate = error.code === "23505";
    return Response.json(
      {
        error: duplicate
          ? "A draft already exists for this proposal."
          : "Could not create draft from this proposal.",
      },
      { status: duplicate ? 409 : 403 },
    );
  }

  return Response.json(data, { status: 201 });
}
