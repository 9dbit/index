# INDEX implementation status

## Production

- Railway project: `INDEX`
- Service: `index-web`
- Production branch: `feat/index-foundation`
- Production URL: `https://index-web-production-2e5b.up.railway.app`
- Supabase project: active and connected
- Auth: Supabase Auth
- Database: PostgreSQL with workspace RLS

## Completed

- [x] INDEX command-center foundation and responsive UI
- [x] Website portfolio and CRUD
- [x] Keyword, alert, report and content modules
- [x] Supabase Auth and protected routes
- [x] Workspace/member roles with RLS
- [x] Production health endpoint with DB reachability
- [x] Proposal Inbox persistence
- [x] Editor proposal / owner approval-rejection workflow
- [x] Approved proposal → one linked draft gate
- [x] Manual proposals prevented from claiming measured GSC provenance
- [x] Deterministic measured-GSC proposal engine
- [x] Weekly measured-proposal deduplication fingerprint
- [x] Measured analysis runner endpoint and UI
- [x] Production behavior when GSC is disconnected: blocked, zero proposals
- [x] Typecheck, lint, database tests and production build green on latest verified source

## Analysis flow

```text
Measured provider data
        ↓
Evidence validation
        ↓
Deterministic analysis rules
        ↓
Proposal Inbox
        ↓
Owner approve / reject
        ↓
Draft creation
        ↓
Publisher connector (not connected yet)
        ↓
Publish
        ↓
Post-publication evaluation
```

### Current measured GSC rules

The first engine compares the latest 14 days to the preceding 14 days and proposes review when measured data shows:

1. Average position worsening by at least 2 positions with sufficient impressions.
2. CTR below 2% while average position is between 3 and 20 and impressions are sufficient.
3. Clicks falling to 70% or less of the prior 14-day period with sufficient prior click volume.

The rule output stores the exact measurements in `proposals.evidence`. It intentionally describes observed signals rather than claiming a cause.

## Release gates

Run on a clean checkout:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Production smoke checks:

```text
GET /api/health            → 200, database reachable
GET /proposals unauth      → redirect /login
POST /api/analysis/run     → 401 when unauthenticated
```

An authenticated analysis run currently returns `gsc_not_connected`, which is expected until the Google connector is configured.

## Next work

### P1 — Google Search Console connector

- [ ] Google OAuth client configuration
- [ ] Read-only scope: `https://www.googleapis.com/auth/webmasters.readonly`
- [ ] Secure refresh-token storage outside exposed application tables
- [ ] Search Console site/property selection
- [ ] Daily query/page/device/country ingestion
- [ ] Populate `site_metrics_daily` with source `gsc`
- [ ] Populate tracked keyword rankings from measured query data where applicable
- [ ] Sync status and failure visibility in INDEX

### P2 — Publisher connectors

- [ ] Per-site publisher adapter contract
- [ ] Credentials stored outside browser-visible tables
- [ ] Explicit publish capability state per site
- [ ] Dry-run / preview before first live publish
- [ ] Job log, retry and failure visibility

### P3 — Evaluation loop

- [ ] Snapshot baseline when a proposal is approved/published
- [ ] Measure 7/14/28-day post-change performance
- [ ] Compare against baseline and seasonality-aware context
- [ ] Record outcome against proposal/rule
- [ ] Use accumulated outcomes to rank future proposals, while keeping human approval as a policy gate

## Non-goals / safety constraints

- Never invent GSC/GA4 metrics when a provider is disconnected.
- Never mark a proposal as measured when its evidence is manual.
- Never publish merely because a proposal was generated.
- Never expose OAuth refresh tokens to browser clients.
- Do not treat correlation after a content change as proof of causation.
