import { supabase, isDemo } from "@/lib/supabase/server";
import { contentInput } from "@/lib/content-input";
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
  const parsed = contentInput
    .partial()
    .omit({ site_id: true })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  const { id } = await params;
  const { data, error } = await db
    .from("content_items")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  return Response.json(
    error ? { error: "Could not update content item." } : data,
    { status: error ? 403 : 200 },
  );
}
