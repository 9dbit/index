import { isDemo, supabase } from "@/lib/supabase/server";
import { proposalDecisionInput } from "@/lib/proposal-input";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (isDemo())
    return Response.json(
      { error: "Proposal decisions are disabled in demo mode." },
      { status: 403 },
    );

  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = proposalDecisionInput.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid decision" },
      { status: 400 },
    );

  const { id } = await params;
  const { data, error } = await db
    .from("proposals")
    .update({
      status: parsed.data.status,
      decision_note: parsed.data.decision_note || null,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "proposed")
    .select()
    .single();

  return Response.json(
    error ? { error: "Only workspace owners can decide a pending proposal." } : data,
    { status: error ? 403 : 200 },
  );
}
