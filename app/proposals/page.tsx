import Link from "next/link";
import { getData } from "@/services/data";
import { ProposalInbox } from "@/features/proposals/inbox";

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
        <Link href="/">← Back to Command Center</Link>
      </div>
      <ProposalInbox data={data} />
    </main>
  );
}
