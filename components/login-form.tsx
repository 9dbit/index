"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
export function LoginForm({
  configured,
  demo,
}: {
  configured: boolean;
  demo: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <div className="panel login-card">
        <div className="brand">
          <span className="brandmark">I</span>
          <div>
            INDEX<small>SEO Command Center</small>
          </div>
        </div>
        <h1>Welcome back.</h1>
        <p className="muted">Your network, in focus.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            const { error } = await browserClient().auth.signInWithPassword({
              email: String(f.get("email")),
              password: String(f.get("password")),
            });
            if (error) {
              setError(error.message);
              setBusy(false);
            } else {
              router.push("/");
              router.refresh();
            }
          }}
        >
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary" disabled={!configured || busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {!configured && (
          <p className="notice">
            Authentication awaits the INDEX Supabase project configuration.
          </p>
        )}
        {error && (
          <p role="alert" className="negative">
            {error}
          </p>
        )}
        {demo && <Link href="/">Explore the demo workspace →</Link>}
      </div>
    </main>
  );
}
