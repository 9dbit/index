import type { Metric, Site } from "@/types";
export const ranges = { "7D": 7, "30D": 30, "3M": 90, "6M": 180, "1Y": 365 };
export function summarize(rows: Metric[], sites: Site[], days: number) {
  const end = rows.reduce((a, r) => (r.date > a ? r.date : a), "");
  const cutoff = new Date(end || "2026-10-02");
  cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
  const start = cutoff.toISOString().slice(0, 10);
  const active = new Set(sites.filter((s) => !s.archived).map((s) => s.id));
  const slice = rows.filter((r) => active.has(r.site_id) && r.date >= start);
  const sum = (key: "clicks" | "impressions") =>
    slice.reduce((a, r) => a + r[key], 0);
  const impressions = sum("impressions");
  return {
    clicks: sum("clicks"),
    impressions,
    position: impressions
      ? slice.reduce((a, r) => a + r.avg_position * r.impressions, 0) /
        impressions
      : null,
    series: Object.values(
      slice.reduce<
        Record<string, { date: string; impressions: number; clicks: number }>
      >((a, r) => {
        a[r.date] ??= { date: r.date, impressions: 0, clicks: 0 };
        a[r.date].impressions += r.impressions;
        a[r.date].clicks += r.clicks;
        return a;
      }, {}),
    ).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
export function comparison(rows: Metric[], sites: Site[], days: number) {
  const end = rows.reduce((a, r) => (r.date > a ? r.date : a), "");
  const cutoff = new Date(end || "2026-10-02");
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const previous = summarize(
    rows.filter((r) => r.date <= cutoff.toISOString().slice(0, 10)),
    sites,
    days,
  );
  const current = summarize(rows, sites, days);
  return {
    clicks: previous.clicks
      ? ((current.clicks - previous.clicks) / previous.clicks) * 100
      : null,
    impressions: previous.impressions
      ? ((current.impressions - previous.impressions) / previous.impressions) *
        100
      : null,
    position:
      previous.position != null && current.position != null
        ? current.position - previous.position
        : null,
  };
}
