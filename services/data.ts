import { demoData } from "@/lib/demo";
import { isDemo, supabase } from "@/lib/supabase/server";
import type { Dataset, Site, Metric } from "@/types";
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
    return { demo: false, sites: [], metrics: [], keywords: [], alerts: [] };
  const results = await Promise.all([
    db
      .from("sites")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("archived", false),
    db.from("keywords").select("*").eq("workspace_id", workspaceId),
    db
      .from("alerts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  for (const r of results) if (r.error) throw new Error(r.error.message);
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
    metrics.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return {
    demo: false,
    seeded: metrics.some(m => (m as Metric & {source?:string}).source === "demo"),
    sites: (results[0].data ?? []) as Site[],
    metrics,
    keywords: results[1].data ?? [],
    alerts: results[2].data ?? [],
    workspaceId,
  } as Dataset;
}
