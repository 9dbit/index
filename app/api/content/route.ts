import { supabase, isDemo } from "@/lib/supabase/server";
import { contentInput } from "@/lib/content-input";
export async function POST(req: Request) {
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
  const parsed = contentInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  const { data: site, error: lookupError } = await db
    .from("sites")
    .select("workspace_id")
    .eq("id", parsed.data.site_id)
    .single();
  if (lookupError || !site)
    return Response.json({ error: "Website unavailable" }, { status: 404 });
  const { data, error } = await db
    .from("content_items")
    .insert({ ...parsed.data, workspace_id: site.workspace_id })
    .select()
    .single();
  return Response.json(
    error ? { error: "Could not save content item." } : data,
    { status: error ? 403 : 201 },
  );
}
