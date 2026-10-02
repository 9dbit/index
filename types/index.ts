export type Health = "Healthy" | "Attention" | "Critical" | "Unavailable";
export type Scores = {
  technical: number;
  content: number;
  index: number;
  authority: number;
  performance: number;
  cwv: number;
};
export type Site = {
  id: string;
  name: string;
  domain: string;
  url: string;
  tier: number;
  niche: string;
  status: Health;
  primary_keyword: string;
  screenshot_url: string | null;
  archived: boolean;
  scores: Scores | null;
  rank: number | null;
  position: number | null;
  clicks: number | null;
  impressions: number | null;
  pages: number | null;
  indexed: number | null;
  growth: number | null;
};
export type Metric = {
  site_id: string;
  date: string;
  clicks: number;
  impressions: number;
  avg_position: number;
  total_pages: number;
  indexed_pages: number;
};
export type Keyword = {
  id: string;
  site_id: string;
  keyword: string;
  position: number;
  previous: number;
  clicks: number;
  impressions: number;
  country: string;
  device: string;
  volume: number | null;
};
export type Alert = {
  id: string;
  site_id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "success";
  created_at: string;
  status: "open" | "resolved";
};
export type Dataset = {
  sites: Site[];
  metrics: Metric[];
  keywords: Keyword[];
  alerts: Alert[];
  demo: boolean;
  seeded?: boolean;
  workspaceId?: string;
};
