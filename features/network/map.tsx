"use client";
import { useState } from "react";
import { ArrowRight, Link2, PauseCircle, Plus, Trash2 } from "lucide-react";
import type { Dataset, NetworkEdge, Site } from "@/types";
import styles from "./network.module.css";

function name(site: Site | undefined) { return site?.name ?? "Unknown site"; }

export function TierNetworkMap({ data }: { data: Dataset }) {
  const activeSites = data.sites.filter((site) => !site.archived);
  const [edges, setEdges] = useState<NetworkEdge[]>(data.networkEdges ?? []);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canEdit = data.role === "owner" || data.role === "editor" || data.demo;
  const source = activeSites.find((site) => site.id === sourceId);
  const targetOptions = source ? activeSites.filter((site) => site.tier === source.tier - 1) : [];
  const byTier = {
    3: activeSites.filter((site) => site.tier === 3),
    2: activeSites.filter((site) => site.tier === 2),
    1: activeSites.filter((site) => site.tier === 1),
  };
  const linkedSources = new Set(edges.map((edge) => edge.source_site_id));
  const orphanCount = activeSites.filter((site) => site.tier > 1 && !linkedSources.has(site.id)).length;

  async function addEdge(form: HTMLFormElement) {
    if (!sourceId || !targetId) { setError("Choose both source and target websites."); return; }
    const formData = new FormData(form);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_site_id: sourceId,
          target_site_id: targetId,
          anchor_text: formData.get("anchor_text") || "",
          target_path: formData.get("target_path") || "/",
          status: formData.get("status") || "planned",
          notes: formData.get("notes") || "",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create relationship");
      setEdges((previous) => [...previous, result as NetworkEdge]);
      setTargetId("");
      form.reset();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create relationship"); }
    finally { setBusy(false); }
  }

  async function removeEdge(id: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/network", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove relationship");
      setEdges((previous) => previous.filter((edge) => edge.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not remove relationship"); }
    finally { setBusy(false); }
  }

  return (
    <section className="panel module">
      <div className="section-heading">
        <div><h2>Tier Network Map</h2><p>Plan editorial support from Tier 3 → Tier 2 → Tier 1 without hiding provenance.</p></div>
        <span className="badge">{edges.length} relationships</span>
      </div>

      <div className={styles.stats}>
        <div><b>{byTier[3].length}</b><span>Tier 3 sites</span></div>
        <div><b>{byTier[2].length}</b><span>Tier 2 sites</span></div>
        <div><b>{byTier[1].length}</b><span>Tier 1 sites</span></div>
        <div><b>{orphanCount}</b><span>unlinked support sites</span></div>
      </div>

      <div className={styles.map}>
        {[3,2,1].map((tier, index) => (
          <div className={styles.tierColumn} key={tier}>
            <div className={styles.tierHeading}><span>Tier {tier}</span><small>{tier === 3 ? "Discovery & support" : tier === 2 ? "Authority bridge" : "Primary destination"}</small></div>
            {byTier[tier as 1|2|3].map((site) => {
              const outgoing = edges.filter((edge) => edge.source_site_id === site.id);
              const incoming = edges.filter((edge) => edge.target_site_id === site.id);
              return <article className={styles.siteCard} key={site.id}>
                <div><b>{site.name}</b><small>{site.domain}</small></div>
                <span className="badge">{outgoing.length} out · {incoming.length} in</span>
                {outgoing.map((edge) => <div className={styles.flow} key={edge.id}><ArrowRight size={12}/><span>{name(activeSites.find((s) => s.id === edge.target_site_id))}</span><small>{edge.status}</small></div>)}
              </article>;
            })}
            {!byTier[tier as 1|2|3].length && <div className={styles.emptyTier}>No Tier {tier} websites</div>}
            {index < 2 && <ArrowRight className={styles.columnArrow} size={18}/>} 
          </div>
        ))}
      </div>

      <div className={styles.builder}>
        <div><h3>Add support relationship</h3><p className="muted">Only one-step relationships are accepted: Tier 3 → Tier 2 or Tier 2 → Tier 1.</p></div>
        <form onSubmit={(e) => { e.preventDefault(); void addEdge(e.currentTarget); }}>
          <select aria-label="Source website" value={sourceId} onChange={(e) => { setSourceId(e.target.value); setTargetId(""); }} required>
            <option value="">Source website</option>
            {activeSites.filter((site) => site.tier > 1).map((site) => <option value={site.id} key={site.id}>T{site.tier} · {site.name}</option>)}
          </select>
          <ArrowRight size={15}/>
          <select aria-label="Target website" value={targetId} onChange={(e) => setTargetId(e.target.value)} required disabled={!sourceId}>
            <option value="">Target website</option>
            {targetOptions.map((site) => <option value={site.id} key={site.id}>T{site.tier} · {site.name}</option>)}
          </select>
          <input name="anchor_text" placeholder="Planned anchor text" />
          <input name="target_path" placeholder="Target path /guide" defaultValue="/" />
          <select name="status" defaultValue="planned"><option value="planned">Planned</option><option value="active">Active</option><option value="paused">Paused</option></select>
          <input name="notes" placeholder="Editorial notes" />
          <button className="primary" disabled={!canEdit || busy}><Plus size={14}/> Add relationship</button>
        </form>
        {error && <p className="negative" role="alert">{error}</p>}
      </div>

      <div className={styles.relationships}>
        <h3>Relationship plan</h3>
        {edges.map((edge) => {
          const sourceSite = activeSites.find((site) => site.id === edge.source_site_id);
          const targetSite = activeSites.find((site) => site.id === edge.target_site_id);
          return <div className={styles.edgeRow} key={edge.id}>
            <Link2 size={14}/><b>{name(sourceSite)}</b><ArrowRight size={13}/><b>{name(targetSite)}</b>
            <span>{edge.anchor_text || "Anchor TBD"}</span><span>{edge.target_path}</span>
            <span className="badge">{edge.status === "paused" ? <PauseCircle size={11}/> : null}{edge.status}</span>
            {canEdit && <button aria-label="Remove relationship" disabled={busy} onClick={() => void removeEdge(edge.id)}><Trash2 size={13}/></button>}
          </div>;
        })}
        {!edges.length && <div className="empty">No tier relationships planned yet.</div>}
      </div>
      <p className="notice">This map is a planning and observability layer. INDEX does not inject links or publish backlinks automatically from this screen.</p>
    </section>
  );
}
