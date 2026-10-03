/** Provider contracts. A disconnected provider must not return simulated live results. */
export type SearchRow = {
  date: string;
  query?: string;
  page?: string;
  country?: string;
  device?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
export interface SearchConsoleProvider {
  fetchPerformance(input: {
    property: string;
    start: string;
    end: string;
  }): Promise<SearchRow[]>;
}
export type AnalyticsRow = {
  date: string;
  users: number;
  sessions: number;
  engagementRate: number;
  landingPage: string;
};
export interface AnalyticsProvider {
  fetchTraffic(input: {
    property: string;
    start: string;
    end: string;
  }): Promise<AnalyticsRow[]>;
}
export type ScreenshotRecord = {
  site_id: string;
  image_url: string;
  captured_at: string;
  viewport: { width: number; height: number };
  hash: string;
  visual_change_score: number | null;
};
export interface ObjectStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<string>;
}
export interface ScreenshotQueue {
  enqueue(input: {
    siteId: string;
    workspaceId: string;
    url: string;
  }): Promise<{ jobId: string }>;
}
export const integrationStatus = {
  gsc: "disconnected",
  ga4: "disconnected",
  r2: "disconnected",
  screenshots: "demo-captures-only",
} as const;
