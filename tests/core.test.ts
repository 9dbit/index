import { test } from "node:test";
import assert from "node:assert/strict";
import { seoScore } from "../lib/score";
import { siteInput } from "../lib/site-input";
import { networkEdgeInput } from "../lib/network-input";
import { summarize } from "../lib/metrics";
import { demoData } from "../lib/demo";
test("SEO weighting totals 100 and missing scores stay missing", () => {
  assert.equal(
    seoScore({
      technical: 100,
      content: 100,
      index: 100,
      authority: 100,
      performance: 100,
      cwv: 100,
    }),
    100,
  );
  assert.equal(seoScore(null), null);
  assert.equal(
    seoScore({
      technical: 100,
      content: 0,
      index: 0,
      authority: 0,
      performance: 0,
      cwv: 0,
    }),
    25,
  );
});
test("site URLs reject executable schemes and tiers outside range", () => {
  assert.equal(
    siteInput.safeParse({
      name: "Example",
      url: "javascript:alert(1)",
      tier: 2,
      niche: "Tech",
    }).success,
    false,
  );
  assert.equal(
    siteInput.safeParse({
      name: "Example",
      url: "https://example.com",
      tier: 4,
      niche: "Tech",
    }).success,
    false,
  );
});
test("date range respects days, excludes archived sites and weights positions", () => {
  const a = summarize(demoData.metrics, demoData.sites, 7);
  assert.equal(a.series.length, 7);
  assert.ok(a.clicks > 0);
  const b = summarize(
    demoData.metrics,
    demoData.sites.map((s) => ({ ...s, archived: true })),
    7,
  );
  assert.equal(b.clicks, 0);
  assert.equal(b.position, null);
});

test("registry metadata validates and network edges cannot self-link", () => {
  assert.equal(
    siteInput.safeParse({
      name: "Tier Three Media",
      url: "https://tier3.example",
      tier: 3,
      niche: "Travel",
      onboarding_mode: "create",
      platform: "nextjs",
      hosting_provider: "Railway",
    }).success,
    true,
  );
  const id = "00000000-0000-4000-a000-000000000001";
  assert.equal(
    networkEdgeInput.safeParse({ source_site_id: id, target_site_id: id }).success,
    false,
  );
});
