"use client";

import { useState } from "react";
import { RefreshCw, SearchCheck } from "lucide-react";

type Result = {
  status?: string;
  reason?: string;
  created?: number;
  metric_rows?: number;
  error?: string;
  detail?: string;
};

export function AnalysisRunner() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/analysis/run", { method: "POST" });
      const body = (await response.json()) as Result;
      if (!response.ok) throw new Error(body.error ?? body.reason ?? "Analysis failed");
      setResult(body);
      if ((body.created ?? 0) > 0) window.location.reload();
    } catch (cause) {
      setResult({ error: cause instanceof Error ? cause.message : "Analysis failed" });
    } finally {
      setBusy(false);
    }
  }

  const blocked = result?.status === "blocked";
  const message = result?.error
    ? result.error
    : result?.reason === "gsc_not_connected"
      ? "Google Search Console is not connected yet. No proposal was generated."
      : result?.reason === "no_measured_gsc_data"
        ? "Search Console is connected, but there is not enough measured GSC data yet."
        : result?.status === "ok"
          ? `${result.created ?? 0} new measured proposal${result.created === 1 ? "" : "s"} created from ${result.metric_rows ?? 0} GSC metric rows.`
          : null;

  return (
    <section className="panel" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">MEASURED ANALYSIS</div>
          <h2>Run Search Console analysis</h2>
          <p className="muted">Creates reviewable proposals only from measured GSC signals. It never publishes content.</p>
        </div>
        <button onClick={run} disabled={busy}>
          {busy ? <RefreshCw size={16} /> : <SearchCheck size={16} />}
          {busy ? "Analyzing…" : "Run analysis"}
        </button>
      </div>
      {message && <p className={result?.error ? "negative" : blocked ? "muted" : "positive"} style={{ marginTop: 10 }}>{message}</p>}
    </section>
  );
}
