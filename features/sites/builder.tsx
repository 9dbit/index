"use client";

import { useState } from "react";
import { Boxes, ExternalLink, Play, RefreshCw, Rocket, ShieldCheck } from "lucide-react";
import type { BuildJob, Dataset, Site } from "@/types";
import styles from "./builder.module.css";

const steps = ["Plan", "Scaffold", "Repository", "Deploy"] as const;

function stepState(job?: BuildJob) {
  if (!job) return 0;
  if (job.status === "live") return 4;
  if (job.status === "deploying") return 3;
  if (job.status === "repo_ready") return 2;
  if (job.status === "scaffolding") return 1;
  return 0;
}

function latestFor(site: Site, jobs: BuildJob[]) {
  return jobs
    .filter((job) => job.site_id === site.id)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
}

export function SiteBuilder({ data }: { data: Dataset }) {
  const [jobs, setJobs] = useState<BuildJob[]>(data.buildJobs ?? []);
  const [sites, setSites] = useState(data.sites);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const plans = sites.filter((site) => !site.archived && site.onboarding_mode === "create");
  const canEdit = !data.demo && (data.role === "owner" || data.role === "editor");
  const executorConnected = data.provisioningReady === true;

  async function start(site: Site) {
    setBusy(site.id);
    setError("");
    try {
      const response = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: site.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start provisioning");
      setJobs((previous) => [result.job as BuildJob, ...previous]);
      setSites((previous) =>
        previous.map((item) =>
          item.id === site.id ? { ...item, build_status: result.site_status } : item,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start provisioning");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="module">
      <div className={styles.hero}>
        <div className={styles.intro}>
          <div className="eyebrow">INDEX SITE FACTORY</div>
          <h2>Site Builder</h2>
          <p>Turn Website Registry build plans into controlled provisioning jobs. Every step stays explicit: plan, scaffold, repository, deployment, live.</p>
        </div>
        <div className={styles.executor}>
          <strong>{executorConnected ? "Provisioning executor connected" : "Provisioning executor not connected"}</strong>
          <p>{executorConnected ? "Build jobs can be handed to the configured executor." : "The queue and approval layer are ready. Connect the executor before INDEX creates repositories or Railway services automatically."}</p>
          <span><ShieldCheck size={12} /> {executorConnected ? "READY" : "SAFE GATE ACTIVE"}</span>
        </div>
      </div>

      {error && <p className="negative" role="alert">{error}</p>}

      <div className={styles.grid}>
        {plans.map((site) => {
          const job = latestFor(site, jobs);
          const progress = stepState(job);
          return (
            <article className={styles.card} key={site.id}>
              <div className={styles.cardHeader}>
                <div>
                  <b>{site.name}</b>
                  <small>{site.domain} · Tier {site.tier} · {site.niche}</small>
                </div>
                <span className="badge">{job?.status ?? site.build_status ?? "planned"}</span>
              </div>

              <div className={styles.meta}>
                <div><span>Platform</span><b>{site.platform ?? "other"}</b></div>
                <div><span>Hosting</span><b>{site.hosting_provider || "Unassigned"}</b></div>
                <div><span>Publisher</span><b>{site.publisher_status ?? "not_configured"}</b></div>
              </div>

              <div className={styles.steps}>
                {steps.map((label, index) => (
                  <div className={`${styles.step} ${index < progress ? styles.stepDone : index === progress ? styles.stepActive : ""}`} key={label}>{label}</div>
                ))}
              </div>

              {job && (
                <div className={`${styles.job} ${job.status === "blocked" ? styles.jobBlocked : ""} ${job.status === "failed" ? styles.jobFailed : ""}`}>
                  <div>
                    <b>{job.status.replaceAll("_", " ")}</b>
                    <p className="muted">{job.last_error || job.next_action || "Build state recorded."}</p>
                  </div>
                  {job.deployment_url && <a href={job.deployment_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>}
                </div>
              )}

              <div className={styles.actions}>
                <button className="primary" disabled={!canEdit || busy === site.id || job?.status === "live"} onClick={() => void start(site)}>
                  {busy === site.id ? <RefreshCw size={14} /> : job ? <Play size={14} /> : <Rocket size={14} />}
                  {job ? "Run / retry provisioning" : "Start provisioning"}
                </button>
                {site.repo_url && <a href={site.repo_url} target="_blank" rel="noreferrer"><button><Boxes size={14} /> Repository</button></a>}
              </div>
            </article>
          );
        })}
      </div>

      {!plans.length && <div className={styles.empty}>No Create-mode websites yet. Add a build plan from Website Registry first.</div>}
    </section>
  );
}
