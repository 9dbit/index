"use client";

import { useState } from "react";
import { RefreshCw, Unplug } from "lucide-react";

type SyncResult = {
  status?: string;
  reason?: string;
  synced_rows?: number;
  matched_sites?: number;
  properties_available?: number;
  error?: string;
};

export function GscControls({ connected, canDisconnect }: { connected: boolean; canDisconnect: boolean }) {
  const [busy, setBusy] = useState<"sync" | "disconnect" | "">("");
  const [result, setResult] = useState<SyncResult | null>(null);

  async function sync() {
    setBusy("sync");
    setResult(null);
    try {
      const response = await fetch("/api/integrations/gsc/sync", { method: "POST" });
      const body = (await response.json()) as SyncResult;
      setResult(body);
      if (response.ok) setTimeout(() => window.location.reload(), 900);
    } catch {
      setResult({ error: "Search Console sync failed" });
    } finally {
      setBusy("");
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Search Console and remove its stored OAuth credentials?")) return;
    setBusy("disconnect");
    setResult(null);
    try {
      const response = await fetch("/api/integrations/gsc/disconnect", { method: "POST" });
      const body = (await response.json()) as SyncResult;
      if (!response.ok) throw new Error(body.error ?? "Disconnect failed");
      window.location.reload();
    } catch (cause) {
      setResult({ error: cause instanceof Error ? cause.message : "Disconnect failed" });
    } finally {
      setBusy("");
    }
  }

  const message = result?.error
    ? result.error
    : result?.reason === "gsc_credentials_missing"
      ? "OAuth credentials are not stored yet. Connect Search Console first."
      : result?.reason === "google_token_refresh_failed"
        ? "Google refresh token failed. Reconnect Search Console."
        : result?.reason === "no_matching_gsc_properties"
          ? `Google returned ${result.properties_available ?? 0} properties, but none matched the domains in INDEX.`
          : result?.status === "ok"
            ? `Synced ${result.synced_rows ?? 0} daily metric rows across ${result.matched_sites ?? 0} matched websites.`
            : result?.reason ?? null;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={sync} disabled={!connected || Boolean(busy)}>
          <RefreshCw size={15} /> {busy === "sync" ? "Syncing…" : "Sync GSC now"}
        </button>
        {canDisconnect && connected && (
          <button onClick={disconnect} disabled={Boolean(busy)}>
            <Unplug size={15} /> {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
          </button>
        )}
      </div>
      {message && <p className={result?.error ? "negative" : result?.status === "ok" ? "positive" : "muted"} style={{ marginTop: 10 }}>{message}</p>}
    </div>
  );
}
