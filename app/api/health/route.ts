import { configured, isDemo, supabase } from "@/lib/supabase/server";
export async function GET() {
  if (isDemo())
    return Response.json({
      status: "ok",
      mode: "demo",
      database: "not-connected",
    });
  if (!configured())
    return Response.json({ status: "unconfigured" }, { status: 503 });
  try {
    const db = await supabase();
    const { error } = await db.from("workspaces").select("id").limit(1);
    return Response.json(
      {
        status: error ? "degraded" : "ok",
        database: error ? "unavailable" : "reachable",
      },
      { status: error ? 503 : 200 },
    );
  } catch {
    return Response.json({ status: "degraded" }, { status: 503 });
  }
}
