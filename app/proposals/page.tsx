import Link from "next/link";
import { getData } from "@/services/data";
import { ProposalInbox } from "@/features/proposals/inbox";
import { AnalysisRunner } from "@/features/proposals/analysis-runner";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const data = await getData();
  return (
    <main style={{ maxWidth: 1480, margin: "0 auto", padding: "28px" }}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">INDEX · SEO COMMAND CENTER</div>
          <h1>Proposal Inbox</h1>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/settings/gsc">Configure GSC</Link>
          <Link href="/">← Back to Command Center</Link>
        </div>
      </div>
      <AnalysisRunner />
      <ProposalInbox data={data} />
    </main>
  );
}
