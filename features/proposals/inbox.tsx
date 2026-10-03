"use client";

import "./inbox.css";

import { useMemo, useState } from "react";
import { CheckCircle2, FilePlus2, SearchCheck, XCircle } from "lucide-react";
import type { Dataset, Proposal, ProposalStatus } from "@/types";

export function ProposalInbox({ data }: { data: Dataset }) {
  const [items, setItems] = useState<Proposal[]>(data.proposals ?? []);
  const [statusFilter, setStatusFilter] = useState<"all" | ProposalStatus>("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [siteId, setSiteId] = useState(data.sites[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [decisionNote, setDecisionNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [drafted, setDrafted] = useState<Set<string>>(new Set());

  const role = data.role ?? "viewer";
  const canPropose = !data.demo && (role === "owner" || role === "editor");
  const canDecide = !data.demo && role === "owner";
  const canDraft = !data.demo && (role === "owner" || role === "editor");
  const gsc = data.integrations?.find((integration) => integration.provider === "gsc");
  const gscRows = data.metrics.filter((metric) => metric.source === "gsc").length;
  const filtered = useMemo(
    () =>
      items.filter(
        (proposal) =>
          (statusFilter === "all" || proposal.status === statusFilter) &&
          (siteFilter === "all" || proposal.site_id === siteFilter),
      ),
    [items, statusFilter, siteFilter],
  );

  const counts = {
    proposed: items.filter((proposal) => proposal.status === "proposed").length,
    approved: items.filter((proposal) => proposal.status === "approved").length,
    rejected: items.filter((proposal) => proposal.status === "rejected").length,
  };

  async function createProposal(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy("create");
    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          title,
          rationale,
          target_keyword: targetKeyword || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not create proposal");
      setItems((current) => [body as Proposal, ...current]);
      setTitle("");
      setRationale("");
      setTargetKeyword("");
      setMessage("Proposal submitted for owner review.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create proposal");
    } finally {
      setBusy("");
    }
  }

  async function decide(proposal: Proposal, status: "approved" | "rejected") {
    setError("");
    setMessage("");
    setBusy(`${proposal.id}:${status}`);
    try {
      const response = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          decision_note: decisionNote[proposal.id] || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save decision");
      setItems((current) =>
        current.map((item) => (item.id === proposal.id ? (body as Proposal) : item)),
      );
      setMessage(status === "approved" ? "Proposal approved." : "Proposal rejected.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save decision");
    } finally {
      setBusy("");
    }
  }

  async function createDraft(proposal: Proposal) {
    setError("");
    setMessage("");
    setBusy(`${proposal.id}:draft`);
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/draft`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not create draft");
      setDrafted((current) => new Set(current).add(proposal.id));
      setMessage("Draft created from the approved proposal. Publishing is still manual.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create draft");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="proposal-stack">
      <section className="proposal-readiness panel">
        <div>
          <span className="eyebrow">ANALYSIS GATE</span>
          <h2>Evidence first, publishing later</h2>
          <p className="muted">
            INDEX only turns measured signals or explicit human input into proposals.
            Approval is separate from draft creation, and no website publisher is connected yet.
          </p>
        </div>
        <div className="proposal-gates">
          <div>
            <SearchCheck size={18} />
            <span>Search Console</span>
            <b className={gsc?.status === "connected" && gscRows > 0 ? "positive" : "muted"}>
              {gsc?.status === "connected"
                ? gscRows > 0
                  ? `${gscRows} measured rows`
                  : "Connected · waiting for metrics"
                : "Not connected · auto analysis paused"}
            </b>
          </div>
          <div>
            <FilePlus2 size={18} />
            <span>Publishing</span>
            <b className="muted">Connector not configured · drafts only</b>
          </div>
        </div>
      </section>

      <div className="proposal-kpis">
        <button className={statusFilter === "proposed" ? "panel active" : "panel"} onClick={() => setStatusFilter("proposed")}>
          <small>Awaiting decision</small><b>{counts.proposed}</b>
        </button>
        <button className={statusFilter === "approved" ? "panel active" : "panel"} onClick={() => setStatusFilter("approved")}>
          <small>Approved</small><b>{counts.approved}</b>
        </button>
        <button className={statusFilter === "rejected" ? "panel active" : "panel"} onClick={() => setStatusFilter("rejected")}>
          <small>Rejected</small><b>{counts.rejected}</b>
        </button>
        <button className={statusFilter === "all" ? "panel active" : "panel"} onClick={() => setStatusFilter("all")}>
          <small>All proposals</small><b>{items.length}</b>
        </button>
      </div>

      {(message || error) && (
        <div className={error ? "notice proposal-message negative" : "notice proposal-message positive"} role={error ? "alert" : "status"}>
          {error || message}
        </div>
      )}

      {canPropose && (
        <form className="panel proposal-form" onSubmit={createProposal}>
          <div>
            <h2>New proposal</h2>
            <p className="muted">Editors can propose. Only an owner can approve or reject.</p>
          </div>
          <select aria-label="Proposal website" value={siteId} onChange={(event) => setSiteId(event.target.value)} required>
            {data.sites.map((site) => (
              <option value={site.id} key={site.id}>{site.name} · {site.domain}</option>
            ))}
          </select>
          <input aria-label="Proposal title" placeholder="What should INDEX improve?" value={title} onChange={(event) => setTitle(event.target.value)} minLength={5} maxLength={240} required />
          <input aria-label="Target keyword" placeholder="Target keyword (optional)" value={targetKeyword} onChange={(event) => setTargetKeyword(event.target.value)} maxLength={200} />
          <textarea aria-label="Proposal rationale" placeholder="Why this is needed, what evidence exists, and what result we expect…" value={rationale} onChange={(event) => setRationale(event.target.value)} minLength={10} maxLength={4000} required />
          <button type="submit" disabled={!siteId || busy === "create"}>{busy === "create" ? "Submitting…" : "Submit proposal"}</button>
        </form>
      )}

      <section className="panel module proposal-list">
        <div className="section-heading proposal-toolbar">
          <div>
            <h2>Proposal Inbox</h2>
            <p className="muted">Review evidence, decide, then create a draft. Nothing publishes automatically.</p>
          </div>
          <select aria-label="Filter proposal website" value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
            <option value="all">All websites</option>
            {data.sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}
          </select>
        </div>

        <div className="proposal-cards">
          {filtered.map((proposal) => {
            const site = data.sites.find((candidate) => candidate.id === proposal.site_id);
            const note = typeof proposal.evidence?.note === "string" ? proposal.evidence.note : null;
            return (
              <article className="proposal-card" key={proposal.id}>
                <div className="proposal-card-head">
                  <div>
                    <span className={`badge proposal-status ${proposal.status}`}>{proposal.status}</span>
                    <span className="badge">{proposal.source === "measured_gsc" ? "Measured GSC" : "Manual"}</span>
                  </div>
                  <small>{new Date(proposal.created_at).toLocaleString()}</small>
                </div>
                <h3>{proposal.title}</h3>
                <p>{proposal.rationale}</p>
                <div className="proposal-meta">
                  <span><b>Website</b>{site?.name ?? "Unavailable"}</span>
                  <span><b>Keyword</b>{proposal.target_keyword || "—"}</span>
                  <span><b>Evidence</b>{note || (proposal.source === "measured_gsc" ? "Measured Search Console signal" : "Human-provided rationale")}</span>
                </div>

                {proposal.decision_note && <p className="proposal-decision"><b>Decision note:</b> {proposal.decision_note}</p>}

                {proposal.status === "proposed" && canDecide && (
                  <div className="proposal-actions">
                    <input
                      aria-label={`Decision note for ${proposal.title}`}
                      placeholder="Decision note (optional)"
                      value={decisionNote[proposal.id] ?? ""}
                      onChange={(event) => setDecisionNote((current) => ({ ...current, [proposal.id]: event.target.value }))}
                    />
                    <button className="approve" disabled={busy.startsWith(proposal.id)} onClick={() => decide(proposal, "approved")}>
                      <CheckCircle2 size={15} /> Approve
                    </button>
                    <button className="reject" disabled={busy.startsWith(proposal.id)} onClick={() => decide(proposal, "rejected")}>
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                )}

                {proposal.status === "proposed" && !canDecide && (
                  <p className="muted proposal-waiting">Waiting for workspace owner decision.</p>
                )}

                {proposal.status === "approved" && canDraft && (
                  <div className="proposal-actions">
                    <button disabled={busy === `${proposal.id}:draft` || drafted.has(proposal.id)} onClick={() => createDraft(proposal)}>
                      <FilePlus2 size={15} /> {drafted.has(proposal.id) ? "Draft created" : busy === `${proposal.id}:draft` ? "Creating…" : "Create draft"}
                    </button>
                    <span className="muted">Draft only. Autopost stays locked until a website publisher is connected.</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {!filtered.length && <div className="empty">No proposals match this filter.</div>}
      </section>
    </div>
  );
}
