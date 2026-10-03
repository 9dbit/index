import { supabase, isDemo } from "@/lib/supabase/server";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (isDemo())
    return Response.json(
      { error: "Demo edits are local to the browser." },
      { status: 403 },
    );
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || body.status !== "resolved")
    return Response.json({ error: "Invalid status" }, { status: 400 });
  const { id } = await params;
  const { data, error } = await db
    .from("alerts")
    .update({ status: "resolved" })
    .eq("id", id)
    .select()
    .single();
  return Response.json(error ? { error: "Could not resolve alert." } : data, {
    status: error ? 403 : 200,
  });
}
