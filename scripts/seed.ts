import { createClient } from "@supabase/supabase-js";
import { demoData } from "../lib/demo";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY,
  workspace = process.env.INDEX_SEED_WORKSPACE_ID;
if (!url || !key || !workspace)
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and INDEX_SEED_WORKSPACE_ID.",
  );
if (process.env.INDEX_CONFIRM_DEMO_SEED !== "true")
  throw new Error(
    "Set INDEX_CONFIRM_DEMO_SEED=true to insert clearly labeled demo data into the selected workspace.",
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: ws, error } = await db
  .from("workspaces")
  .select("id,name")
  .eq("id", workspace)
  .single();
if (error || !ws) throw new Error("Workspace not found");
// Fresh dedicated demo workspace only: never overwrite real website records.
const { count, error: countError } = await db
  .from("sites")
  .select("id", { count: "exact", head: true })
  .eq("workspace_id", workspace);
if (countError || count)
  throw new Error("Seeding requires an empty dedicated demo workspace.");
for (const site of demoData.sites) {
  const { id: seedId, ...values } = site;
  const { data: created, error } = await db
    .from("sites")
    .insert({ ...values, workspace_id: workspace })
    .select("id")
    .single();
  if (error) throw error;
  const rows = demoData.metrics
    .filter((m) => m.site_id === seedId)
    .map((m) => ({
      ...m,
      site_id: created.id,
      workspace_id: workspace,
      source: "demo",
    }));
  for (let offset = 0; offset < rows.length; offset += 500) {
    const { error } = await db
      .from("site_metrics_daily")
      .insert(rows.slice(offset, offset + 500));
    if (error) throw error;
  }
  const keys = demoData.keywords
    .filter((k) => k.site_id === seedId)
    .map(({ id: oldId, ...k }) => {
      void oldId;
      return { ...k, site_id: created.id, workspace_id: workspace };
    });
  const { error: kwError } = await db.from("keywords").insert(keys);
  if (kwError) throw kwError;
  const alerts = demoData.alerts
    .filter((a) => a.site_id === seedId)
    .map(({ id: oldId, ...a }) => {
      void oldId;
      return { ...a, site_id: created.id, workspace_id: workspace };
    });
  if (alerts.length) {
    const { error } = await db.from("alerts").insert(alerts);
    if (error) throw error;
  }
  const content = demoData.content
    .filter((item) => item.site_id === seedId)
    .map(({ id: oldId, ...item }) => {
      void oldId;
      return { ...item, site_id: created.id, workspace_id: workspace };
    });
  if (content.length) {
    const { error: contentError } = await db
      .from("content_items")
      .insert(content);
    if (contentError) throw contentError;
  }
  const s = site.scores!;
  const { error: scoreError } = await db.from("seo_scores").insert({
    workspace_id: workspace,
    site_id: created.id,
    date: "2026-10-02",
    technical_score: s.technical,
    content_score: s.content,
    index_score: s.index,
    authority_score: s.authority,
    performance_score: s.performance,
    cwv_score: s.cwv,
  });
  if (scoreError) throw scoreError;
}
console.log("Seed inserted into the selected dedicated demo workspace.");
