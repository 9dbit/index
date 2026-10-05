"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, ExternalLink, Globe2, Plus, PlugZap, X } from "lucide-react";
import type { Dataset, Site } from "@/types";
import styles from "./registry.module.css";

type Mode = "create" | "connect";

export function WebsiteRegistry({ data }: { data: Dataset }) {
  const [sites, setSites] = useState(data.sites);
  const [mode, setMode] = useState<Mode | null>(null);
  const [tier, setTier] = useState("all");
  const [source, setSource] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canEdit = data.role === "owner" || data.role === "editor" || data.demo;
  const visible = useMemo(
    () => sites.filter((site) =>
      !site.archived &&
      (tier === "all" || String(site.tier) === tier) &&
      (source === "all" || (site.onboarding_mode ?? "connect") === source)),
    [sites, tier, source],
  );
  const planned = sites.filter((site) => site.build_status === "planned" || site.build_status === "provisioning").length;
  const publisherReady = sites.filter((site) => site.publisher_status === "ready").length;

  async function submit(form: HTMLFormElement) {
    const raw = Object.fromEntries(new FormData(form));
    const onboarding_mode = mode ?? "connect";
    const body = {
      ...raw,
      tier: Number(raw.tier),
      onboarding_mode,
      build_status: onboarding_mode === "create" ? "planned" : "connected",
      publisher_status: "not_configured",
    };
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not register website");
      setSites((previous) => [...previous, result as Site]);
      setMode(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not register website");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel module">
      <div className="section-heading">
        <div>
          <h2>Website Registry</h2>
          <p>One inventory for planned builds and connected websites.</p>
        </div>
        <div className={styles.actions}>
          <button disabled={!canEdit} onClick={() => setMode("connect")}><PlugZap size={15} /> Connect Website</button>
          <button className="primary" disabled={!canEdit} onClick={() => setMode("create")}><Plus size={15} /> Create New Website</button>
        </div>
      </div>

      <div className={styles.summary}>
        <div><Globe2 size={18} /><span><b>{sites.filter((s) => !s.archived).length}</b> registered</span></div>
        <div><Boxes size={18} /><span><b>{planned}</b> build plans</span></div>
        <div><PlugZap size={18} /><span><b>{publisherReady}</b> publisher-ready</span></div>
      </div>

      <div className="filters">
        <select aria-label="Registry tier" value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="all">All tiers</option><option value="1">Tier 1</option><option value="2">Tier 2</option><option value="3">Tier 3</option>
        </select>
        <select aria-label="Registry source" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">All onboarding</option><option value="create">Create</option><option value="connect">Connected</option>
        </select>
      </div>

      <div className="table-scroll">
        <table className={styles.table}>
          <thead><tr><th>Website</th><th>Tier</th><th>Onboarding</th><th>Platform</th><th>Hosting</th><th>Build</th><th>Publisher</th><th>Repository</th></tr></thead>
          <tbody>
            {visible.map((site) => (
              <tr key={site.id}>
                <td><Link href={`/sites/${site.id}`} className={styles.siteName}>{site.name}</Link><small>{site.domain}</small></td>
                <td><span className="badge">Tier {site.tier}</span></td>
                <td>{site.onboarding_mode === "create" ? "Create" : "Connect"}</td>
                <td>{site.platform ?? "other"}</td>
                <td>{site.hosting_provider || "—"}</td>
                <td><span className="badge">{site.build_status ?? "connected"}</span></td>
                <td><span className="badge">{site.publisher_status ?? "not_configured"}</span></td>
                <td>{site.repo_url ? <a href={site.repo_url} target="_blank" rel="noreferrer">Repo <ExternalLink size={11} /></a> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && <div className="empty">No websites match this registry filter.</div>}
      <p className="notice">Create mode records the intended website and build plan. Provisioning is intentionally separate until the site-builder worker is connected. Connect mode registers an existing website without claiming control of its CMS or hosting.</p>

      {mode && (
        <div className="overlay" onClick={() => !busy && setMode(null)}>
          <section className={`panel modal ${styles.modal}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="section-heading">
              <div><h2>{mode === "create" ? "Create New Website" : "Connect Existing Website"}</h2><p>{mode === "create" ? "Register a build plan for INDEX." : "Add an existing site to the command center."}</p></div>
              <button aria-label="Close" onClick={() => setMode(null)}><X size={17} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget); }}>
              <label>Name<input autoFocus name="name" required placeholder="Example Media" /></label>
              <label>{mode === "create" ? "Intended website URL" : "Website URL"}<input name="url" type="url" required placeholder="https://example.com" /></label>
              <div className="form-grid">
                <label>Tier<select name="tier" defaultValue={mode === "create" ? 3 : 2}><option value="1">Tier 1</option><option value="2">Tier 2</option><option value="3">Tier 3</option></select></label>
                <label>Niche<input name="niche" required placeholder="Travel, finance, lifestyle…" /></label>
              </div>
              <label>Primary target keyword<input name="primary_keyword" placeholder="Optional" /></label>
              <div className="form-grid">
                <label>Platform<select name="platform" defaultValue={mode === "create" ? "nextjs" : "other"}><option value="nextjs">Next.js</option><option value="wordpress">WordPress</option><option value="static">Static</option><option value="webflow">Webflow</option><option value="other">Other</option></select></label>
                <label>Hosting<input name="hosting_provider" placeholder={mode === "create" ? "Railway" : "Provider name"} defaultValue={mode === "create" ? "Railway" : ""} /></label>
              </div>
              <label>Repository URL<input name="repo_url" type="url" placeholder="https://github.com/org/repo" /></label>
              <label>CMS / admin URL<input name="cms_url" type="url" placeholder="https://example.com/wp-admin" /></label>
              <label>Notes<input name="notes" placeholder="Ownership, content role, launch notes…" /></label>
              {error && <p role="alert" className="negative">{error}</p>}
              <button className="primary" disabled={busy}>{busy ? "Saving…" : mode === "create" ? "Create build plan" : "Connect website"}</button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
