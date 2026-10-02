import { supabase, isDemo } from "@/lib/supabase/server";
import { siteInput } from "@/lib/site-input";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (isDemo())
    return Response.json(
      { error: "Demo writes are disabled" },
      { status: 403 },
    );
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = siteInput
    .partial()
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Invalid website details" }, { status: 400 });
  const { id } = await params;
  const { data, error } = await db
    .from("sites")
    .update({
      ...parsed.data,
      ...(parsed.data.url ? { domain: new URL(parsed.data.url).hostname } : {}),
    })
    .eq("id", id)
    .select()
    .single();
  return Response.json(error ? { error: "Could not update website." } : data, {
    status: error ? 400 : 200,
  });
}
