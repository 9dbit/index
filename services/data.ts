import { demoData } from "@/lib/demo";
import { isDemo, supabase } from "@/lib/supabase/server";
import type {
  Dataset,
  Integration,
  Metric,
  NetworkEdge,
  BuildJob,
  Proposal,
  Site,
  WorkspaceRole,
} from "@/types";

export async function getData(): Promise<Dataset> {
  if (isDemo()) return demoData;
  const db = await supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new Error("Authentication required");

  const { data: workspaces, error: workspaceError } = await db
    .from("workspaces")
    .select("id")
    .order("created_at")
    .limit(1);
  if (workspaceError) throw new Error(workspaceError.message);
  const workspaceId = workspaces?.[0]?.id;
  if (!workspaceId)
    return {
      demo: false,
      sites: [],
      metrics: [],
      keywords: [],
      alerts: [],
      content: [],
      proposals: [],
      integrations: [],
      networkEdges: [],
      buildJobs: [],
      provisioningReady: Boolean(process.env.INDEX_PROVISIONING_WEBHOOK && process.env.INDEX_PROVISIONING_TOKEN),
      role: "viewer",
    };

  const results = await Promise.all([
    db.from("sites").select("*").eq("workspace_id", workspaceId).eq("archived", false),
    db.from("keywords").select("*").eq("workspace_id", workspaceId),
    db.from("alerts").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100),
    db.from("content_items").select("*").eq("workspace_id", workspaceId).order("topic"),
    db.from("proposals").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    db.from("integrations").select("provider,status,property_id,last_synced_at").eq("workspace_id", workspaceId),
    db.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle(),
    db.from("site_network_edges").select("*").eq("workspace_id", workspaceId).order("created_at"),
    db.from("site_build_jobs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
  ]);
  for (const result of results) if (result.error) throw new Error(result.error.message);

  const metrics: Metric[] = [];
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 731);
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from("site_metrics_daily")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("date", cutoff.toISOString().slice(0, 10))
      .order("date")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    metrics.push(...((data ?? []) as Metric[]));
    if (!data || data.length < 1000) break;
  }

  return {
    demo: false,
    seeded: metrics.some((metric) => metric.source === "demo"),
    sites: (results[0].data ?? []) as Site[],
    metrics,
    keywords: results[1].data ?? [],
    alerts: results[2].data ?? [],
    content: results[3].data ?? [],
    proposals: (results[4].data ?? []) as Proposal[],
    integrations: (results[5].data ?? []) as Integration[],
    role: (results[6].data?.role ?? "viewer") as WorkspaceRole,
    networkEdges: (results[7].data ?? []) as NetworkEdge[],
    buildJobs: (results[8].data ?? []) as BuildJob[],
    provisioningReady: Boolean(process.env.INDEX_PROVISIONING_WEBHOOK && process.env.INDEX_PROVISIONING_TOKEN),
    workspaceId,
  } as Dataset;
}
