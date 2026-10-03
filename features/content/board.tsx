"use client";
import { useState } from "react";
import type { ContentItem, ContentState, Site } from "@/types";
import { CONTENT_STATES } from "@/types";
export function ContentBoard({
  items,
  sites,
  onSave,
  demo,
}: {
  items: ContentItem[];
  sites: Site[];
  onSave: (values: Partial<ContentItem>, id?: string) => Promise<void>;
  demo: boolean;
}) {
  const [open, setOpen] = useState<ContentItem | "new" | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [siteFilter, setSiteFilter] = useState("all"),
    [query, setQuery] = useState("");
  const visible = items.filter(
    (item) =>
      (siteFilter === "all" || item.site_id === siteFilter) &&
      `${item.topic} ${item.keyword ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      sites.some((s) => s.id === item.site_id),
  );
  async function save(values: Partial<ContentItem>, id?: string) {
    setBusy(true);
    setError("");
    try {
      await onSave(values, id);
      setOpen(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save item");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel module">
      <div className="section-heading">
        <div>
          <h2>Editorial workspace</h2>
          <p>
            Ideas move through research, review and publishing with an
            accountable owner.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setError("");
            setOpen("new");
          }}
          disabled={!sites.length}
        >
          + New item
        </button>
      </div>
      <p className="muted">
        {demo
          ? "Demo changes last until reload."
          : "Workspace content is saved."}{" "}
        Publishing requires a provider connection and editorial review.
      </p>
      <div className="filters">
        <input
          aria-label="Search content"
          placeholder="Search topics or keywords…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Content site"
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
        >
          <option value="all">All websites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="kanban">
        {CONTENT_STATES.map((state) => (
          <div key={state}>
            <h3>
              {state}{" "}
              <small>{visible.filter((i) => i.state === state).length}</small>
            </h3>
            {visible
              .filter((i) => i.state === state)
              .map((item) => (
                <button
                  className="content-card"
                  key={item.id}
                  onClick={() => {
                    setError("");
                    setOpen(item);
                  }}
                >
                  <b>{item.topic}</b>
                  <span>{sites.find((s) => s.id === item.site_id)?.name}</span>
                  <small>
                    {item.keyword ?? "No target keyword"} ·{" "}
                    {item.author ?? "Unassigned"}
                  </small>
                </button>
              ))}
            {!visible.some((i) => i.state === state) && (
              <div className="empty">No items</div>
            )}
          </div>
        ))}
      </div>
      {open && (
        <div className="overlay" onClick={() => setOpen(null)}>
          <div
            className="panel modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              open === "new" ? "New content item" : "Edit content item"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{open === "new" ? "New content item" : "Edit content item"}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const values = {
                  site_id:
                    open === "new" ? String(f.get("site_id")) : open.site_id,
                  topic: String(f.get("topic")).trim(),
                  keyword: String(f.get("keyword")).trim() || null,
                  author: String(f.get("author")).trim() || null,
                  state: String(f.get("state")) as ContentState,
                };
                if (values.topic.length < 3) {
                  setError("Topic needs at least three characters.");
                  return;
                }
                await save(values, open === "new" ? undefined : open.id);
              }}
            >
              <label>
                Website
                <select
                  name="site_id"
                  defaultValue={open === "new" ? sites[0]?.id : open.site_id}
                  disabled={open !== "new"}
                >
                  {sites.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Topic
                <input
                  name="topic"
                  required
                  minLength={3}
                  maxLength={240}
                  defaultValue={open === "new" ? "" : open.topic}
                />
              </label>
              <label>
                Primary keyword
                <input
                  name="keyword"
                  maxLength={200}
                  defaultValue={open === "new" ? "" : (open.keyword ?? "")}
                />
              </label>
              <label>
                Author
                <input
                  name="author"
                  maxLength={100}
                  defaultValue={open === "new" ? "" : (open.author ?? "")}
                />
              </label>
              <label>
                State
                <select
                  name="state"
                  defaultValue={open === "new" ? "Idea" : open.state}
                >
                  {CONTENT_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {error && (
                <p role="alert" className="negative">
                  {error}
                </p>
              )}
              <div className="section-heading">
                <button type="button" onClick={() => setOpen(null)}>
                  Cancel
                </button>
                <button disabled={busy} className="primary">
                  {busy ? "Saving…" : "Save item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
