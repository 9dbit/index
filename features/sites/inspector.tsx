"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import type { Dataset, Site } from "@/types";
import { number, weights } from "@/lib/score";
import { Score } from "./portfolio";
import { VisibilityChart } from "@/features/dashboard/chart";
export function Inspector({
  site,
  data,
  onClose,
  onEdit,
}: {
  site: Site;
  data: Dataset;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [tab, setTab] = useState("Overview");
  const keywords = data.keywords.filter((k) => k.site_id === site.id);
  return (
    <aside className="inspector panel">
      <header>
        <div className="site-avatar">{site.name.slice(0, 1)}</div>
        <div>
          <h3>{site.name}</h3>
          <a href={site.url} target="_blank" rel="noreferrer">
            {site.domain} ↗
          </a>
        </div>
        <button
          className="close-inspector"
          aria-label="Close inspector"
          onClick={onClose}
        >
          <X size={15} />
        </button>
      </header>
      <div className="inspector-state">
        <span className={`badge ${site.status.toLowerCase()}`}>
          {site.status}
        </span>
        <button onClick={onEdit}>Edit site</button>
      </div>
      <div className="tabs">
        {["Overview", "Keywords", "Pages", "Backlinks", "Technical"].map(
          (t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ),
        )}
      </div>
      <div className="inspector-body">
        {tab === "Overview" ? (
          <>
            <div className="section-heading">
              <span>Organic visibility</span>
              <b>{number(site.clicks)}</b>
            </div>
            <VisibilityChart
              compact
              data={data.metrics
                .filter((m) => m.site_id === site.id)
                .slice(-90)}
            />
            <div className="inspector-metrics">
              <div>
                <small>Google Rank</small>
                <b>#{site.rank ?? "—"}</b>
              </div>
              <div>
                <small>Avg Position</small>
                <b>{number(site.position)}</b>
              </div>
              <div>
                <small>Impressions</small>
                <b>{number(site.impressions)}</b>
              </div>
            </div>
            <h4>Top Keywords</h4>
            <table>
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Position</th>
                  <th>Move</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((k) => (
                  <tr key={k.id}>
                    <td>{k.keyword}</td>
                    <td>{k.position}</td>
                    <td
                      className={
                        k.previous > k.position ? "positive" : "negative"
                      }
                    >
                      {k.previous - k.position > 0 ? "+" : ""}
                      {k.previous - k.position}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4>Crawl Health</h4>
            <div className="inspector-metrics">
              <div>
                <small>Pages</small>
                <b>{number(site.pages)}</b>
              </div>
              <div>
                <small>Indexed</small>
                <b>{number(site.indexed)}</b>
              </div>
              <Score site={site} />
            </div>
          </>
        ) : tab === "Keywords" ? (
          <table>
            <tbody>
              {keywords.map((k) => (
                <tr key={k.id}>
                  <td>{k.keyword}</td>
                  <td>#{k.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "Technical" ? (
          <>
            <h4>INDEX SEO Score components</h4>
            {Object.entries(weights).map(([key, w]) => (
              <div className="score-row" key={key}>
                <span>
                  {key} <small>({w}%)</small>
                </span>
                <b>{site.scores?.[key as keyof typeof weights] ?? "—"}</b>
                <progress
                  max="100"
                  value={site.scores?.[key as keyof typeof weights] ?? 0}
                />
              </div>
            ))}
          </>
        ) : (
          <div className="empty">
            {tab === "Pages"
              ? `${number(site.pages)} pages reported. Connect a crawl source for individual URLs.`
              : "No backlink source connected."}
          </div>
        )}
        <Link className="workspace-link" href={`/sites/${site.id}`}>
          Open website workspace <ArrowUpRight size={15} />
        </Link>
      </div>
    </aside>
  );
}
