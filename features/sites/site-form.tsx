"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { Site } from "@/types";
import { siteInput } from "@/lib/site-input";
export function SiteForm({
  site,
  onClose,
  onSave,
}: {
  site?: Site;
  onClose: () => void;
  onSave: (values: Partial<Site>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="overlay" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={site ? "Edit website" : "Add website"}
        className="panel modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-heading">
          <h2>{site ? "Edit website" : "Add website"}</h2>
          <button aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const p = siteInput.safeParse(Object.fromEntries(f));
            if (!p.success) {
              setError(p.error.issues[0].message);
              return;
            }
            setBusy(true);
            try {
              await onSave(p.data);
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not save");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Name
            <input autoFocus name="name" defaultValue={site?.name} required />
          </label>
          <label>
            Website URL
            <input
              name="url"
              type="url"
              placeholder="https://example.com"
              defaultValue={site?.url}
              required
            />
          </label>
          <div className="form-grid">
            <label>
              Tier
              <select name="tier" defaultValue={site?.tier ?? 2}>
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    Tier {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Niche
              <input name="niche" defaultValue={site?.niche} required />
            </label>
          </div>
          <label>
            Primary tracked keyword
            <input
              name="primary_keyword"
              defaultValue={site?.primary_keyword}
            />
          </label>
          {error && (
            <p role="alert" className="negative">
              {error}
            </p>
          )}
          <div className="section-heading">
            {site && (
              <button
                type="button"
                className="negative"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onSave({ archived: true });
                    onClose();
                  } catch {
                    setError("Could not archive");
                    setBusy(false);
                  }
                }}
              >
                Archive website
              </button>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save website"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
