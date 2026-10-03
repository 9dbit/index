import Link from "next/link";
import { getData } from "@/services/data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GscSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const data = await getData();
  const integration = data.integrations?.find((item) => item.provider === "gsc");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://index-web-production-2e5b.up.railway.app";
  const callbackUrl = `${appUrl.replace(/\/$/, "")}/api/integrations/gsc/callback`;
  const credentialsReady = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const error = typeof params.error === "string" ? params.error : "";
  const connected = params.connected === "1" || integration?.status === "connected";

  const errors: Record<string, string> = {
    google_credentials_missing: "Google OAuth credentials are not configured on Railway yet.",
    oauth_state_invalid: "The OAuth state expired or did not match. Start the connection again.",
    role_required: "An owner or editor role is required to connect Search Console.",
    refresh_token_missing: "Google did not return a refresh token. Reconnect and approve consent again.",
    token_exchange_failed: "Google token exchange failed.",
    credential_store_failed: "The refresh token could not be stored in Supabase Vault.",
    google_access_denied: "Google access was denied.",
    demo_mode: "Google integrations are disabled in demo mode.",
  };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 28 }}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">INDEX · INTEGRATIONS</div>
          <h1>Google Search Console</h1>
        </div>
        <Link href="/proposals">← Proposal Inbox</Link>
      </div>

      {error && <div className="notice negative" role="alert">{errors[error] ?? `Connection error: ${error}`}</div>}
      {params.connected === "1" && <div className="notice positive">Search Console authorization is connected and its refresh token is stored in Supabase Vault.</div>}

      <section className="panel module" style={{ marginBottom: 14 }}>
        <h2>Connection status</h2>
        <div className="report-summary" style={{ marginTop: 14 }}>
          <b>OAuth config: {credentialsReady ? "Ready" : "Missing"}</b>
          <b>Integration: {connected ? "Connected" : integration?.status ?? "Disconnected"}</b>
          <b>Last sync: {integration?.last_synced_at ? new Date(integration.last_synced_at).toLocaleString() : "Not synced yet"}</b>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          INDEX requests read-only Search Console access. OAuth refresh tokens are stored in Supabase Vault, not in browser-visible tables.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {credentialsReady ? (
            <Link href="/api/integrations/gsc/start"><button>{connected ? "Reconnect Search Console" : "Connect Search Console"}</button></Link>
          ) : (
            <button disabled>Connect Search Console</button>
          )}
          <Link href="/proposals"><button>Back to proposals</button></Link>
        </div>
      </section>

      <section className="panel module">
        <h2>Google Cloud setup</h2>
        <p className="muted">Create a Web application OAuth client, enable the Search Console API, and use this exact authorized redirect URI:</p>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", marginTop: 12 }}>{callbackUrl}</pre>
        <p style={{ marginTop: 14 }}>Railway variables required:</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>GOOGLE_CLIENT_ID={"<Google OAuth client ID>"}{"\n"}GOOGLE_CLIENT_SECRET={"<Google OAuth client secret>"}</pre>
        <p className="muted" style={{ marginTop: 12 }}>
          After those two variables are present, return here and press Connect Search Console. INDEX will request only the read-only webmasters scope.
        </p>
      </section>
    </main>
  );
}
