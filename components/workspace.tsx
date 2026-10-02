"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronLeft,
  FileText,
  Globe,
  House,
  KeyRound,
  Link2,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Dataset, Site } from "@/types";
import { number } from "@/lib/score";
import { ranges, summarize, comparison } from "@/lib/metrics";
import { VisibilityChart } from "@/features/dashboard/chart";
import { Portfolio } from "@/features/sites/portfolio";
import { Inspector } from "@/features/sites/inspector";
import { SiteForm } from "@/features/sites/site-form";
import { Modules } from "@/features/modules/modules";
import { browserClient } from "@/lib/supabase/client";
const navigation = [
  ["overview", "Overview", House],
  ["sites", "Sites", Globe],
  ["content", "Content", FileText],
  ["keywords", "Keywords", KeyRound],
  ["backlinks", "Backlinks", Link2],
  ["performance", "Performance", Activity],
  ["seo-health", "SEO Health", ShieldCheck],
  ["alerts", "Alerts", Bell],
  ["reports", "Reports", BarChart3],
  ["settings", "Settings", Settings],
] as const;
export function Workspace({
  initial,
  route,
  siteId,
}: {
  initial: Dataset;
  route: string;
  siteId?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial),
    [selected, setSelected] = useState(initial.sites[0]?.id ?? ""),
    [inspectorOpen, setInspectorOpen] = useState(false),
    [range, setRange] = useState<keyof typeof ranges>("6M"),
    [collapsed, setCollapsed] = useState(false),
    [drawer, setDrawer] = useState(false),
    [form, setForm] = useState<Site | "new" | null>(null),
    [command, setCommand] = useState(false),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState(""),
    [detailTab, setDetailTab] = useState("Overview");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
      if (e.key === "Escape") {
        setCommand(false);
        setForm(null);
        setDrawer(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  useEffect(() => {
    if (command) searchRef.current?.focus();
  }, [command]);
  const active = data.sites.filter((s) => !s.archived),
    site = active.find((s) => s.id === (siteId ?? selected)),
    stats = summarize(data.metrics, active, ranges[range]),
    delta = comparison(data.metrics, active, ranges[range]);
  async function save(values: Partial<Site>) {
    const editing = form !== "new" && form !== null ? form : undefined;
    if (data.demo) {
      const existing = editing ?? {
        id: crypto.randomUUID(),
        status: "Unavailable",
        scores: null,
        screenshot_url: null,
        rank: null,
        position: null,
        clicks: null,
        impressions: null,
        pages: null,
        indexed: null,
        growth: null,
        archived: false,
      };
      const updated = {
        ...existing,
        ...values,
        domain: values.url ? new URL(values.url).hostname : editing?.domain,
      } as Site;
      if (
        data.sites.some(
          (s) => s.id !== updated.id && s.domain === updated.domain,
        )
      )
        throw new Error("This domain already exists");
      setData({
        ...data,
        sites: editing
          ? data.sites.map((s) => (s.id === editing.id ? updated : s))
          : [...data.sites, updated],
      });
      setNotice("Demo change saved for this session. Reload resets demo data.");
      return;
    }
    const response = await fetch(
      editing ? `/api/sites/${editing.id}` : "/api/sites",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    setData({
      ...data,
      sites: editing
        ? data.sites.map((s) => (s.id === editing.id ? body : s))
        : [...data.sites, body],
    });
    setNotice("Website saved.");
  }
  const title = siteId
    ? site?.name
    : (navigation.find((n) => n[0] === route)?.[1] ?? "Overview");
  return (
    <div className={`app ${collapsed ? "collapsed" : ""}`}>
      <header className="topbar">
        <button
          className="mobile-toggle"
          aria-label="Open navigation"
          onClick={() => setDrawer(!drawer)}
        >
          <Menu size={20} />
        </button>
        <Link className="brand" href="/">
          <span className="brandmark">I</span>
          <div>
            INDEX<small>SEO Command Center</small>
          </div>
        </Link>
        <button className="global-search" onClick={() => setCommand(true)}>
          <Search size={17} />
          <span>Search websites, pages, keywords…</span>
          <kbd>⌘ K</kbd>
        </button>
        <span className="mode">
          <i />
          {data.demo ? "DEMO WORKSPACE" : "WORKSPACE"}
        </span>
        <Link className="notification" href="/alerts" aria-label="Alerts">
          <Bell size={20} />
          <span>{data.alerts.filter((a) => a.status === "open").length}</span>
        </Link>
        <div className="user-avatar">{data.demo ? "D" : "I"}</div>
      </header>
      <aside className={`sidebar ${drawer ? "open" : ""}`}>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {navigation.map(([key, label, Icon]) => (
            <Link
              title={label}
              href={key === "overview" ? "/" : `/${key}`}
              key={key}
              className={route === key ? "active" : ""}
              onClick={() => setDrawer(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === "alerts" && (
                <small>
                  {data.alerts.filter((a) => a.status === "open").length}
                </small>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="network-card">
            <Activity size={27} />
            <h3>
              Your network.
              <br />
              One clear view.
            </h3>
            <p>
              Track the signals.
              <br />
              Focus on what matters.
            </p>
            <span className="positive">● {active.length} websites in view</span>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft size={16} />
            <span>Collapse sidebar</span>
          </button>
          {!data.demo && (
            <button
              onClick={async () => {
                await browserClient().auth.signOut();
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </aside>
      <main className="main">
        <div className="page-heading">
          <div>
            <div className="eyebrow">NETWORK INTELLIGENCE</div>
            <h1>{title}</h1>
          </div>
          <div className="heading-meta">
            <span className="muted">
              {data.demo ? "Seed data · through Oct 2, 2026" : "Workspace data"}
            </span>
            <div className="segmented">
              {Object.keys(ranges).map((r) => (
                <button
                  key={r}
                  className={range === r ? "active" : ""}
                  onClick={() => setRange(r as keyof typeof ranges)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        {(data.demo || data.seeded) && (
          <div className="demo-banner">
            Demo workspace · Sample metrics and preview captures. Google
            services are not connected.
          </div>
        )}
        {notice && (
          <div role="status" className="notice">
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={12} />
            </button>
          </div>
        )}
        {siteId && site ? (
          <>
            <div className="detail-header panel">
              <div>
                <a href={site.url} target="_blank" rel="noreferrer">
                  {site.domain} ↗
                </a>
                <p>
                  Tier {site.tier} · {site.niche} · {site.status}
                </p>
              </div>
              <button onClick={() => setForm(site)}>Edit website</button>
            </div>
            <div className="detail-tabs tabs">
              {[
                "Overview",
                "Analytics",
                "Google Performance",
                "Keywords",
                "Content",
                "Pages",
                "Internal Links",
                "Backlinks",
                "SEO Health",
                "Technical",
                "Screenshots",
                "Alerts",
                "Settings",
              ].map((t) => (
                <button
                  className={detailTab === t ? "active" : ""}
                  onClick={() => setDetailTab(t)}
                  key={t}
                >
                  {t}
                </button>
              ))}
            </div>
            {["Overview", "Analytics", "Google Performance"].includes(
              detailTab,
            ) ? (
              <section className="panel module">
                <h2>{detailTab}</h2>
                <VisibilityChart
                  data={summarize(data.metrics, [site], ranges[range]).series}
                />
                <div className="report-summary">
                  <b>{number(site.clicks)} clicks</b>
                  <b>{number(site.impressions)} impressions</b>
                  <b>Position {number(site.position)}</b>
                </div>
              </section>
            ) : detailTab === "Screenshots" ? (
              <section className="panel module">
                <h2>Homepage captures</h2>
                {site.screenshot_url ? (
                  <>
                    <img
                      className="capture"
                      src={site.screenshot_url}
                      alt="Demo homepage capture"
                    />
                    <p className="muted">
                      Seed preview captured from a local demo page. Live capture
                      worker is not connected.
                    </p>
                  </>
                ) : (
                  <div className="empty">No screenshots captured yet.</div>
                )}
              </section>
            ) : ["Pages", "Internal Links", "Technical"].includes(detailTab) ? (
              <section className="panel module">
                <h2>{detailTab}</h2>
                <div className="empty">
                  Connect a crawl worker to populate this view.
                </div>
              </section>
            ) : (
              <Modules
                route={detailTab.toLowerCase().replaceAll(" ", "-")}
                data={data}
                site={site}
              />
            )}
          </>
        ) : route === "overview" || route === "sites" ? (
          <>
            {route === "overview" && (
              <>
                <div className="kpis">
                  {[
                    ["Websites", active.length, "Portfolio", Globe],
                    [
                      "Total Pages",
                      active.reduce((a, s) => a + (s.pages ?? 0), 0),
                      "Reported pages",
                      FileText,
                    ],
                    [
                      "Indexed Pages",
                      active.reduce((a, s) => a + (s.indexed ?? 0), 0),
                      "Index coverage",
                      ShieldCheck,
                    ],
                    [
                      `${range} Impressions`,
                      stats.impressions,
                      delta.impressions == null
                        ? "No comparison"
                        : `${delta.impressions >= 0 ? "+" : ""}${delta.impressions.toFixed(1)}% vs previous`,
                      BarChart3,
                    ],
                    [
                      "Organic Clicks",
                      stats.clicks,
                      delta.clicks == null
                        ? "No comparison"
                        : `${delta.clicks >= 0 ? "+" : ""}${delta.clicks.toFixed(1)}% vs previous`,
                      ArrowUpRight,
                    ],
                    [
                      "Avg. Google Position",
                      stats.position,
                      delta.position == null
                        ? "No comparison"
                        : `${delta.position >= 0 ? "+" : ""}${delta.position.toFixed(1)} vs previous`,
                      Activity,
                    ],
                  ].map(([label, val, sub, Icon], i) => {
                    const Glyph = Icon as typeof Globe;
                    return (
                      <div className={`kpi panel kpi-${i}`} key={String(label)}>
                        <div className="kpi-icon">
                          <Glyph size={19} />
                        </div>
                        <div>
                          <small>{String(label)}</small>
                          <b>{number(val as number)}</b>
                          <span>{String(sub)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="overview-row">
                  <section className="panel visibility">
                    <div className="section-heading">
                      <div>
                        <h2>Organic Visibility</h2>
                        <p>Total impressions across your website network</p>
                      </div>
                      <div className="legend">
                        <span>● Impressions</span>
                        <span>● Clicks</span>
                      </div>
                    </div>
                    <VisibilityChart data={stats.series} />
                  </section>
                  <section className="panel alerts-summary">
                    <div className="section-heading">
                      <h2>Alerts & Updates</h2>
                      <Link href="/alerts">View all ↗</Link>
                    </div>
                    {data.alerts.slice(0, 4).map((a) => (
                      <Link href="/alerts" className="alert-row" key={a.id}>
                        <span className={`alert-icon ${a.severity}`}>
                          {a.severity === "critical"
                            ? "↓"
                            : a.severity === "success"
                              ? "↗"
                              : "!"}
                        </span>
                        <div>
                          <h3>{a.title}</h3>
                          <p>
                            {data.sites.find((s) => s.id === a.site_id)?.domain}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </section>
                </div>
              </>
            )}
            <div className={`portfolio-layout ${!site ? "no-inspector" : ""}`}>
              <Portfolio
                sites={data.sites}
                selected={selected}
                onSelect={(s) => {
                  setSelected(s.id);
                  setInspectorOpen(true);
                }}
                onAdd={() => setForm("new")}
              />
              {site && (
                <div
                  className={
                    inspectorOpen ? "inspector-host show" : "inspector-host"
                  }
                >
                  <Inspector
                    key={site.id}
                    site={site}
                    data={data}
                    onClose={() => {
                      setSelected("");
                      setInspectorOpen(false);
                    }}
                    onEdit={() => setForm(site)}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <Modules route={route} data={data} />
        )}
        <footer>
          INDEX <span>SEO Command Center</span>
          <span>
            {data.demo ? "DEMO · No live Google data" : "Workspace data"}
          </span>
        </footer>
      </main>
      {form && (
        <SiteForm
          site={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
          onSave={save}
        />
      )}{" "}
      {command && (
        <div className="overlay" onClick={() => setCommand(false)}>
          <div
            className="panel command"
            role="dialog"
            aria-label="Global search"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="search">
              <Search size={18} />
              <input
                ref={searchRef}
                placeholder="Search websites, keywords, alerts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button onClick={() => setCommand(false)}>Esc</button>
            </div>
            {active
              .filter((s) =>
                `${s.name} ${s.domain}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((s) => (
                <Link
                  onClick={() => setCommand(false)}
                  key={s.id}
                  href={`/sites/${s.id}`}
                >
                  <Globe size={16} />
                  <div>
                    {s.name}
                    <small>{s.domain}</small>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            {data.keywords
              .filter((k) => search && k.keyword.includes(search.toLowerCase()))
              .slice(0, 5)
              .map((k) => (
                <Link
                  href="/keywords"
                  key={k.id}
                  onClick={() => setCommand(false)}
                >
                  <KeyRound size={16} />
                  {k.keyword}
                </Link>
              ))}
            {data.alerts
              .filter(
                (a) =>
                  search &&
                  `${a.title} ${a.message}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .map((a) => (
                <Link
                  href="/alerts"
                  key={a.id}
                  onClick={() => setCommand(false)}
                >
                  <Bell size={16} />
                  {a.title}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
