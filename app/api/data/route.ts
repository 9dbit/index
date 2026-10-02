import { getData } from "@/services/data";
export async function GET() {
  try {
    return Response.json(await getData());
  } catch {
    return Response.json({ error: "Could not load data" }, { status: 503 });
  }
}
