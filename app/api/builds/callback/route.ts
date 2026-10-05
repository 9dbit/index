import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const callbackInput = z.object({
  job_id: z.uuid(),
  status: z.enum(["scaffolding", "repo_ready", "deploying", "live", "blocked", "failed"]),
  repo_url: z.url().nullable().optional(),
  deployment_url: z.url().nullable().optional(),
  next_action: z.string().max(500).nullable().optional(),
  last_error: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  const token = process.env.INDEX_PROVISIONING_TOKEN;
  const auth = req.headers.get("authorization");
  if (!token || auth !== `Bearer ${token}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole)
    return Response.json({ error: "Provisioning callback database credentials are not configured" }, { status: 503 });

  const parsed = callbackInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid callback payload" }, { status: 400 });

  const db = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: job, error: readError } = await db
    .from("site_build_jobs")
    .select("id,workspace_id,site_id")
    .eq("id", parsed.data.job_id)
    .maybeSingle();
  if (readError || !job) return Response.json({ error: "Build job not found" }, { status: 404 });

  const patch = {
    status: parsed.data.status,
    repo_url: parsed.data.repo_url ?? undefined,
    deployment_url: parsed.data.deployment_url ?? undefined,
    next_action: parsed.data.next_action ?? null,
    last_error: parsed.data.last_error ?? null,
  };
  const { error: updateError } = await db
    .from("site_build_jobs")
    .update(patch)
    .eq("id", job.id)
    .eq("workspace_id", job.workspace_id);
  if (updateError) return Response.json({ error: "Could not update build job" }, { status: 400 });

  const sitePatch: Record<string, string | null> = {
    build_status:
      parsed.data.status === "live"
        ? "live"
        : parsed.data.status === "failed" || parsed.data.status === "blocked"
          ? "blocked"
          : "provisioning",
  };
  if (parsed.data.repo_url) sitePatch.repo_url = parsed.data.repo_url;
  if (parsed.data.deployment_url && parsed.data.status === "live") sitePatch.url = parsed.data.deployment_url;

  await db
    .from("sites")
    .update(sitePatch)
    .eq("id", job.site_id)
    .eq("workspace_id", job.workspace_id);

  return Response.json({ ok: true });
}
