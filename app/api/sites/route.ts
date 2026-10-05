import { supabase, isDemo } from "@/lib/supabase/server";
import { siteInput } from "@/lib/site-input";
export async function POST(req: Request) {
  if (isDemo())
    return Response.json(
      { error: "Demo changes are local to your browser." },
      { status: 403 },
    );
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = siteInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  const { data: ws } = await db
    .from("workspaces")
    .select("id")
    .limit(1)
    .single();
  if (!ws)
    return Response.json(
      {
        error:
          "No workspace assigned. Ask your administrator to add your account.",
      },
      { status: 403 },
    );
  const { data, error } = await db
    .from("sites")
    .insert({
      ...parsed.data,
      repo_url: parsed.data.repo_url || null,
      cms_url: parsed.data.cms_url || null,
      hosting_provider: parsed.data.hosting_provider || null,
      build_status:
        parsed.data.build_status ??
        (parsed.data.onboarding_mode === "create" ? "planned" : "connected"),
      domain: new URL(parsed.data.url).hostname,
      workspace_id: ws.id,
    })
    .select()
    .single();
  return Response.json(
    error
      ? {
          error:
            error.code === "23505"
              ? "This domain already exists."
              : "Could not save website.",
        }
      : data,
    { status: error ? 400 : 201 },
  );
}
