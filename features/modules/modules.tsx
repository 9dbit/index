"use client";
import { useState } from "react";
import type { ContentItem, Dataset, Site } from "@/types";
import { number, seoScore, weights } from "@/lib/score";
import { VisibilityChart } from "@/features/dashboard/chart";
import { ranges, summarize, summarizeBetween } from "@/lib/metrics";
import { ContentBoard } from "@/features/content/board";
export function Modules({
  route,
  data,
  site,
  onContentSave,
  onAlertResolve,
}: {
  route: string;
  data: Dataset;
  site?: Site;
  onContentSave: (values: Partial<ContentItem>, id?: string) => Promise<void>;
  onAlertResolve: (id: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [siteFilter, setSiteFilter] = useState("all"),
    [tierFilter, setTierFilter] = useState("all"),
    [countryFilter, setCountryFilter] = useState("all"),
    [deviceFilter, setDeviceFilter] = useState("all"),
    [movementFilter, setMovementFilter] = useState("all"),
    [reportRange, setReportRange] = useState("30D"),
    [customStart, setCustomStart] = useState(""),
    [customEnd, setCustomEnd] = useState(""),
    [alertError, setAlertError] = useState("");
  const sites = site ? [site] : data.sites;
  const ids = new Set(sites.map((s) => s.id));
  const keywords = data.keywords.filter((k) => ids.has(k.site_id));
  if (route === "keywords")
    return (
      <section className="panel module">
        <h2>Keyword intelligence</h2>
        <p className="muted">
          Tracked positions · Google Rank uses the primary tracked keyword
        </p>
        <div className="filters">
          <input
            aria-label="Search keywords"
            placeholder="Search keywords…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Position group"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              "all",
              "Top 3",
              "Top 10",
              "Top 20",
              "Top 50",
              "Top 100",
              "Striking Distance",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          {!site && (
            <select
              aria-label="Keyword site"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
            >
              <option value="all">All websites</option>
              {sites.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Keyword tier"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="all">All tiers</option>
            {[1, 2, 3].map((t) => (
              <option value={t} key={t}>
                Tier {t}
              </option>
            ))}
          </select>
          <select
            aria-label="Keyword country"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
          >
            <option value="all">All countries</option>
            {[...new Set(keywords.map((k) => k.country))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Keyword device"
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
          >
            <option value="all">All devices</option>
            {[...new Set(keywords.map((k) => k.device))].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Keyword movement"
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value)}
          >
            <option value="all">All movement</option>
            <option value="up">Moved up</option>
            <option value="down">Moved down</option>
            <option value="flat">No change</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Keyword",
                  "Site",
                  "Position",
                  "Previous",
                  "Change",
                  "Clicks",
                  "Impressions",
                  "CTR",
                  "Volume",
                  "Country",
                  "Device",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keywords
                .filter(
                  (k) =>
                    k.keyword.toLowerCase().includes(query.toLowerCase()) &&
                    (siteFilter === "all" || k.site_id === siteFilter) &&
                    (tierFilter === "all" ||
                      String(sites.find((s) => s.id === k.site_id)?.tier) ===
                        tierFilter) &&
                    (countryFilter === "all" || k.country === countryFilter) &&
                    (deviceFilter === "all" || k.device === deviceFilter) &&
                    (movementFilter === "all" ||
                      (movementFilter === "up"
                        ? k.previous > k.position
                        : movementFilter === "down"
                          ? k.previous < k.position
                          : k.previous === k.position)) &&
                    (filter === "all" ||
                      (filter === "Striking Distance"
                        ? k.position >= 11 && k.position <= 20
                        : k.position <= Number(filter.split(" ")[1]))),
                )
                .map((k) => (
                  <tr key={k.id}>
                    <td>{k.keyword}</td>
                    <td>{sites.find((s) => s.id === k.site_id)?.name}</td>
                    <td>#{k.position}</td>
                    <td>{k.previous}</td>
                    <td
                      className={
                        k.previous > k.position ? "positive" : "negative"
                      }
                    >
                      {k.previous - k.position}
                    </td>
                    <td>{number(k.clicks)}</td>
                    <td>{number(k.impressions)}</td>
                    <td>{((k.clicks / k.impressions) * 100).toFixed(1)}%</td>
                    <td>{number(k.volume)}</td>
                    <td>{k.country}</td>
                    <td>{k.device}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!keywords.length && (
          <div className="empty">
            No tracked keywords yet. Connect a ranking source to begin.
          </div>
        )}
      </section>
    );
  if (route === "alerts")
    return (
      <section className="panel module">
        <h2>Alerts & Updates</h2>
        <p className="muted">Prioritize the issues that need your attention.</p>
        {alertError && (
          <p role="alert" className="negative">
            {alertError}
          </p>
        )}
        {data.alerts
          .filter((a) => ids.has(a.site_id))
          .map((a) => (
            <div className="alert-row" key={a.id}>
              <span className={`alert-icon ${a.severity}`}>!</span>
              <div>
                <h3>{a.title}</h3>
                <p>{a.message}</p>
                <small>
                  {sites.find((s) => s.id === a.site_id)?.name} ·{" "}
                  {new Date(a.created_at).toLocaleString()}
                </small>
              </div>
              <span className="badge">{a.status}</span>
              {a.status === "open" && (
                <button
                  onClick={async () => {
                    setAlertError("");
                    try {
                      await onAlertResolve(a.id);
                    } catch (e) {
                      setAlertError(
                        e instanceof Error
                          ? e.message
                          : "Could not resolve alert",
                      );
                    }
                  }}
                >
                  Resolve
                </button>
              )}
            </div>
          ))}
        {!data.alerts.length && <div className="empty">No alerts.</div>}
      </section>
    );
  if (route === "seo-health" || route === "performance")
    return (
      <section className="panel module">
        <h2>
          {route === "seo-health"
            ? "SEO Health"
            : "Performance & Core Web Vitals"}
        </h2>
        <p className="muted">
          Component scores are stored separately. Unmeasured vitals remain
          unavailable.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Website",
                  "SEO Score",
                  ...Object.keys(weights),
                  "LCP",
                  "INP",
                  "CLS",
                  "Status",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{seoScore(s.scores) ?? "—"}</td>
                  {Object.keys(weights).map((k) => (
                    <td key={k}>
                      {s.scores?.[k as keyof typeof weights] ?? "—"}
                    </td>
                  ))}
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="notice">
          Connect PageSpeed Insights / CrUX and a crawl worker for measured
          performance and technical checks.
        </p>
      </section>
    );
  if (route === "content")
    return (
      <ContentBoard
        items={data.content.filter((c) => ids.has(c.site_id))}
        sites={sites}
        onSave={onContentSave}
        demo={data.demo}
      />
    );
  if (route === "backlinks")
    return (
      <section className="panel module">
        <h2>Backlinks & Network relationships</h2>
        <p className="muted">
          Source domain → target URL · editorial observability
        </p>
        <div className="empty">
          No backlink provider connected. Imported links will appear here with
          anchor text, follow status, first seen and last seen.
        </div>
      </section>
    );
  if (route === "reports") {
    const days =
      reportRange === "90D"
        ? 90
        : (ranges[reportRange as keyof typeof ranges] ?? 30);
    const summary =
      reportRange === "Custom"
        ? summarizeBetween(data.metrics, sites, customStart, customEnd)
        : summarize(data.metrics, sites, days);
    return (
      <section className="panel module">
        <h2>Network Summary</h2>
        <p className="muted">
          {reportRange === "Custom"
            ? `${customStart || "Start"} – ${customEnd || "End"}`
            : `Last ${days} days of available data`}{" "}
          · {data.demo ? "Demo dataset" : "Workspace data"}
        </p>
        <div className="filters">
          <select
            aria-label="Report range"
            value={reportRange}
            onChange={(e) => setReportRange(e.target.value)}
          >
            {["7D", "30D", "90D", "6M", "1Y", "Custom"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          {reportRange === "Custom" && (
            <>
              <label>
                From
                <input
                  type="date"
                  aria-label="Report start date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  aria-label="Report end date"
                  value={customEnd}
                  min={customStart}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        <div className="report-summary">
          <b>{sites.length} websites</b>
          <b>{number(summary.clicks)} clicks</b>
          <b>{number(summary.impressions)} impressions</b>
        </div>
        <VisibilityChart data={summary.series} />
        <button
          onClick={() => {
            const text = JSON.stringify(
              {
                source: data.demo ? "demo" : "supabase",
                range: reportRange,
                ...(reportRange === "Custom"
                  ? { from: customStart, to: customEnd }
                  : {}),
                ...summary,
              },
              null,
              2,
            );
            const url = URL.createObjectURL(
              new Blob([text], { type: "application/json" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "index-network-summary.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export summary JSON
        </button>
      </section>
    );
  }
  return (
    <section className="panel module">
      <h2>Workspace settings</h2>
      <p className="muted">
        Connection status is explicit. Demo data never represents a live
        integration.
      </p>
      {[
        "Supabase",
        "Google Search Console",
        "Google Analytics 4",
        "Cloudflare R2",
        "Screenshot worker",
      ].map((n) => (
        <div className="settings-row" key={n}>
          <div>
            <h3>{n}</h3>
            <p>
              {n === "Supabase"
                ? "Authentication, workspace access and website records"
                : n === "Screenshot worker"
                  ? "Capture history, content hashes and visual change monitoring"
                  : "Integration adapter prepared; credentials and activation required"}
            </p>
          </div>
          <span className="badge">
            {n === "Supabase" && !data.demo ? "Connected" : "Not connected"}
          </span>
        </div>
      ))}
      <p className="notice">
        Google Rank = primary tracked keyword position. Avg Position =
        impression-weighted Search Console position. Search volume is
        unavailable without an external provider.
      </p>
    </section>
  );
}
