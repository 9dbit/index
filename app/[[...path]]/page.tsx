import { getData } from "@/services/data";
import { Workspace } from "@/components/workspace";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const allowed = [
    "sites",
    "content",
    "keywords",
    "backlinks",
    "performance",
    "alerts",
    "reports",
    "settings",
    "seo-health",
  ];
  if (
    path.length > 2 ||
    (path[0] && !allowed.includes(path[0])) ||
    (path.length === 2 && path[0] !== "sites")
  )
    notFound();
  const data = await getData();
  if (path.length === 2 && !data.sites.some((s) => s.id === path[1]))
    notFound();
  return (
    <Workspace initial={data} route={path[0] ?? "overview"} siteId={path[1]} />
  );
}
