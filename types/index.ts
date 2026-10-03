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
  source?: "demo" | "gsc" | "ga4" | "manual";
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
export const CONTENT_STATES = [
  "Idea",
  "Research",
  "Draft",
  "Review",
  "Scheduled",
  "Published",
  "Needs Update",
  "Failed",
] as const;
export type ContentState = (typeof CONTENT_STATES)[number];
export type ContentItem = {
  id: string;
  site_id: string;
  topic: string;
  keyword: string | null;
  author: string | null;
  publish_date: string | null;
  url: string | null;
  quality_score: number | null;
  state: ContentState;
  proposal_id?: string | null;
};
export type WorkspaceRole = "owner" | "editor" | "viewer";
export type ProposalStatus = "proposed" | "approved" | "rejected";
export type ProposalSource = "manual" | "measured_gsc";
export type Proposal = {
  id: string;
  workspace_id: string;
  site_id: string;
  title: string;
  rationale: string;
  target_keyword: string | null;
  evidence: Record<string, unknown>;
  source: ProposalSource;
  fingerprint: string | null;
  status: ProposalStatus;
  created_by: string | null;
  decided_by: string | null;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
};
export type Integration = {
  provider: "gsc" | "ga4" | "r2" | "crux";
  status: string;
  property_id: string | null;
  last_synced_at: string | null;
};
export type Dataset = {
  sites: Site[];
  metrics: Metric[];
  keywords: Keyword[];
  alerts: Alert[];
  content: ContentItem[];
  proposals?: Proposal[];
  integrations?: Integration[];
  role?: WorkspaceRole;
  demo: boolean;
  seeded?: boolean;
  workspaceId?: string;
};
