import { isDemo, supabase } from "@/lib/supabase/server";
import { z } from "zod";

const buildInput = z.object({ site_id: z.uuid() });

export async function POST(req: Request) {
  if (isDemo()) return Response.json({ error: "Demo provisioning is disabled" }, { status: 403 });

  const db = await supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = buildInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid website id" }, { status: 400 });

  const { data: workspace } = await db.from("workspaces").select("id").order("created_at").limit(1).maybeSingle();
  if (!workspace) return Response.json({ error: "No workspace assigned" }, { status: 403 });

  const { data: site, error: siteError } = await db
    .from("sites")
    .select("id,name,url,tier,niche,onboarding_mode,platform,hosting_provider,repo_url,cms_url,build_status")
    .eq("workspace_id", workspace.id)
    .eq("id", parsed.data.site_id)
    .maybeSingle();

  if (siteError || !site) return Response.json({ error: "Website not found" }, { status: 404 });
  if (site.onboarding_mode !== "create")
    return Response.json({ error: "Only Create-mode websites can enter the provisioning queue." }, { status: 400 });

  const executorUrl = process.env.INDEX_PROVISIONING_WEBHOOK;
  const executorToken = process.env.INDEX_PROVISIONING_TOKEN;
  const executorReady = Boolean(executorUrl && executorToken);
  const status = executorReady ? "queued" : "blocked";
  const nextAction = executorReady ? "Waiting for provisioning executor" : "Connect INDEX provisioning executor";
  const lastError = executorReady
    ? null
    : "Provisioning executor is not connected. INDEX will not create repositories or deployments until the executor is configured.";

  const { data: job, error: jobError } = await db
    .from("site_build_jobs")
    .insert({
      workspace_id: workspace.id,
      site_id: site.id,
      status,
      requested_by: auth.user.id,
      next_action: nextAction,
      last_error: lastError,
      details: {
        site_name: site.name,
        requested_platform: site.platform,
        requested_hosting: site.hosting_provider,
      },
    })
    .select()
    .single();

  if (jobError || !job) return Response.json({ error: "Could not create provisioning job." }, { status: 400 });

  const siteStatus = executorReady ? "provisioning" : "blocked";
  await db.from("sites").update({ build_status: siteStatus }).eq("id", site.id).eq("workspace_id", workspace.id);

  if (executorReady) {
    const payload = {
      job_id: job.id,
      workspace_id: workspace.id,
      site: {
        id: site.id,
        name: site.name,
        url: site.url,
        tier: site.tier,
        niche: site.niche,
        platform: site.platform,
        hosting_provider: site.hosting_provider,
        repo_url: site.repo_url,
        cms_url: site.cms_url,
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/builds/callback`,
    };

    try {
      const response = await fetch(executorUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${executorToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Executor returned ${response.status}`);
    } catch (error) {
      const failure = error instanceof Error ? error.message : "Executor request failed";
      await db
        .from("site_build_jobs")
        .update({ status: "failed", last_error: failure, next_action: "Check provisioning executor" })
        .eq("id", job.id)
        .eq("workspace_id", workspace.id);
      await db.from("sites").update({ build_status: "blocked" }).eq("id", site.id).eq("workspace_id", workspace.id);
      return Response.json({ job: { ...job, status: "failed", last_error: failure }, site_status: "blocked" }, { status: 202 });
    }
  }

  return Response.json({ job, site_status: siteStatus }, { status: 201 });
}
