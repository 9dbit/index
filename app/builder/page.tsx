import Link from "next/link";
import { getData } from "@/services/data";
import { SiteBuilder } from "@/features/sites/builder";

export const dynamic = "force-dynamic";

export default async function BuilderPage() {
  const data = await getData();
  return (
    <main className="standalone-page">
      <div className="standalone-nav">
        <Link href="/registry">← Registry</Link>
        <Link href="/network">Tier Network</Link>
      </div>
      <SiteBuilder data={data} />
    </main>
  );
}
