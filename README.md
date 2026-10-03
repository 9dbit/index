# INDEX — SEO Command Center

Desktop-first network observability built with Next.js, React, TypeScript, Recharts and Supabase. Railway hosts the web service. The navy dashboard follows the supplied visual reference.

## Run

Node 22 or 24. `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`.

`INDEX_DEMO_MODE=true` is an explicit, public demo: only seeded data is served; server writes are rejected. Browser demo edits last until reload. It is **not** a live SEO monitoring deployment. Missing Supabase configuration without demo mode fails closed at login.

## Validate

```sh
npm ci
npm run lint
npm run typecheck
npm test
INDEX_DEMO_MODE=true npm run build
INDEX_DEMO_MODE=true npm start
# In another terminal:
npx playwright install chromium
npm run test:e2e
```

For a preinstalled browser, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Unit tests include PostgreSQL execution of the migration with cross-workspace RLS checks using PGlite. Playwright covers demo CRUD, filters, inspector, navigation, mobile, routes, and write restrictions.

## Supabase activation

1. Select or create a dedicated INDEX Supabase project. Do not apply this schema to an unrelated application's project.
2. Link using the Supabase CLI and apply the tracked migration with `supabase db push`.
3. Create an email/password user in Supabase Authentication. Provision a workspace and membership using the administrator script below. Workspace membership is never self-assigned by the client.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Railway; the publishable API key is also accepted in the latter variable. Set `INDEX_DEMO_MODE=false` and rebuild. Public Next.js environment values are compiled into browser bundles.
5. Configure Supabase Auth Site URL to the Railway URL. Test login, logout, refresh, viewer denial, editor CRUD and persisted data. Run Supabase security/performance advisors.

```sql
-- Replace the UUID with an existing Auth user. Run using the SQL editor as admin.
with workspace as (insert into public.workspaces(name) values('INDEX') returning id)
insert into public.workspace_members(workspace_id,user_id,role)
select id,'REPLACE_WITH_AUTH_USER_UUID'::uuid,'owner' from workspace;
```

The frontend only receives the public key. RLS protects all exposed tables. Composite foreign keys prevent cross-workspace relationships. Owner/editor can mutate sites, keywords, content and alerts; viewer is read-only. Metrics and worker output are not directly writable by clients. OAuth tokens must be kept in a private secret vault, never the integrations table.

## Data and definitions

- Google Rank = primary tracked keyword position. Avg Position = impression-weighted GSC position.
- Score = technical 25%, content 20%, index 15%, authority 15%, performance 15%, CWV 10%. Unmeasured values are null, not fabricated zeroes.
- Network chart aggregates daily rows for the selected period; comparisons use the preceding equal-length period.
- Demo card snapshots are illustrative 30-day snapshots, separately seeded from the historical series.
- Seed previews are actual browser captures of local demo HTML (`scripts/capture-demo.ts`); `public/previews/manifest.json` records viewport, timestamp and SHA-256. They are not captures of the named public domains.

## Architecture and remaining integrations

`app/` owns routes and auth-gated APIs; `features/` contains portfolio, inspector, chart and module UI; `services/` owns database loading and provider contracts; `supabase/migrations/` owns schema history. No service-role key is needed by the web app.

The current build includes portfolio CRUD, an editorial board with create/edit/status moves, keyword filters by site/tier/position/movement/country/device, score views, alert resolution, custom-range report JSON export, and login/server-backed Sites/Content/Alerts APIs. Backlink, crawl and integration views intentionally show honest empty/disconnected states. GSC/GA4 OAuth, ingestion jobs, remote screenshot worker, visual diff, R2 upload, scheduling and PDF export are **not activated or fully implemented**. Provider contracts and tables are in place; do not advertise these as working integrations.

Remote screenshot capture must run in an isolated worker with restricted egress and private/link-local/metadata IP blocking at every redirect/resource request. Do not expose arbitrary browser URL capture through the web app. R2 integration is deferred until this worker is deployed.

See `IMPLEMENTATION.md` for the running acceptance checklist.
