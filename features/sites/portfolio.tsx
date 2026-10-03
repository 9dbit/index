"use client";
import { useState } from "react";
import { ExternalLink, LayoutGrid, List, Search, Plus } from "lucide-react";
import type { Site } from "@/types";
import { number, seoScore } from "@/lib/score";
export function Score({ site }: { site: Site }) {
  const n = seoScore(site.scores);
  return (
    <div
      className="score"
      style={
        {
          "--score": `${(n ?? 0) * 3.6}deg`,
          "--score-color": (n ?? 0) >= 80 ? "#39e5b8" : "#efbc53",
        } as React.CSSProperties
      }
    >
      <span>{n ?? "—"}</span>
    </div>
  );
}
export function Portfolio({
  sites,
  selected,
  onSelect,
  onAdd,
}: {
  sites: Site[];
  selected: string;
  onSelect: (s: Site) => void;
  onAdd: () => void;
}) {
  const [query, setQuery] = useState(""),
    [tier, setTier] = useState(0),
    [niche, setNiche] = useState("All Niches"),
    [sort, setSort] = useState("SEO Score"),
    [list, setList] = useState(false);
  const visible = sites
    .filter(
      (s) =>
        !s.archived &&
        (!tier || s.tier === tier) &&
        (niche === "All Niches" || s.niche === niche) &&
        `${s.name} ${s.domain}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Google Rank"
        ? (a.rank ?? 999) - (b.rank ?? 999)
        : sort === "Avg Position"
          ? (a.position ?? 999) - (b.position ?? 999)
          : sort === "Organic Traffic"
            ? (b.clicks ?? -1) - (a.clicks ?? -1)
            : sort === "Highest Growth"
              ? (b.growth ?? -999) - (a.growth ?? -999)
              : sort === "Needs Attention"
                ? ["Critical", "Attention", "Unavailable", "Healthy"].indexOf(
                    a.status,
                  ) -
                  ["Critical", "Attention", "Unavailable", "Healthy"].indexOf(
                    b.status,
                  )
                : (seoScore(b.scores) ?? -1) - (seoScore(a.scores) ?? -1),
    );
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Website Portfolio</h2>
          <p>
            Monitor and manage your network.{" "}
            <span className="blue">
              {sites.filter((s) => !s.archived).length} websites.
            </span>
          </p>
        </div>
        <button className="primary" onClick={onAdd}>
          <Plus size={14} /> Add website
        </button>
      </div>
      <div className="filters">
        <div className="segmented">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              className={tier === n ? "active" : ""}
              onClick={() => setTier(n)}
            >
              {n ? `Tier ${n}` : "All"}
            </button>
          ))}
        </div>
        <select
          aria-label="Niche"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
        >
          {["All Niches", ...new Set(sites.map((s) => s.niche))].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <select
          aria-label="Sort websites"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {[
            "SEO Score",
            "Google Rank",
            "Avg Position",
            "Organic Traffic",
            "Highest Growth",
            "Needs Attention",
          ].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <div className="search small">
          <Search size={14} />
          <input
            aria-label="Search websites"
            placeholder="Search websites…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          aria-label={list ? "Grid view" : "List view"}
          onClick={() => setList(!list)}
        >
          {list ? <LayoutGrid size={16} /> : <List size={16} />}
        </button>
      </div>
      <div className={`portfolio ${list ? "list-view" : ""}`}>
        {visible.map((s) => (
          <button
            className={`site-card ${selected === s.id ? "selected" : ""}`}
            key={s.id}
            onClick={() => onSelect(s)}
          >
            <div className="preview">
              {s.screenshot_url ? (
                <img
                  src={s.screenshot_url}
                  alt={`${s.name} demo homepage preview`}
                />
              ) : (
                <div className="preview-empty">No capture yet</div>
              )}
              <div className="tags">
                <span>Tier {s.tier}</span>
                <span>{s.niche}</span>
              </div>
            </div>
            <div className="site-info">
              <div>
                <h3>
                  {s.name} <ExternalLink size={11} />
                </h3>
                <div className="blue domain">{s.domain}</div>
                <div className="site-status">
                  <i className={s.status.toLowerCase()} />
                  {s.status}
                </div>
              </div>
              <div className="score-wrap">
                <Score site={s} />
                <small>SEO Score</small>
              </div>
            </div>
            <div className="site-stats">
              <div>
                <small>Google Rank</small>
                <b>{s.rank ? `#${s.rank}` : "—"}</b>
              </div>
              <div>
                <small>Avg Position</small>
                <b>{number(s.position)}</b>
              </div>
              <div>
                <small>Organic Clicks</small>
                <b>{number(s.clicks)}</b>
              </div>
              <div>
                <small>Growth</small>
                <b className={(s.growth ?? 0) < 0 ? "negative" : "positive"}>
                  {s.growth == null
                    ? "—"
                    : `${s.growth > 0 ? "+" : ""}${s.growth}%`}
                </b>
              </div>
            </div>
          </button>
        ))}
      </div>
      {!visible.length && (
        <div className="empty panel">No websites match these filters.</div>
      )}
    </section>
  );
}
