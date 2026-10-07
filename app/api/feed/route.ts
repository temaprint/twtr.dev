import { getSession } from "@/lib/session";
import { getFeed, getMentionFeed } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") === "mentions" ? "mentions" : "following";
  const before = url.searchParams.get("before") ?? undefined;

  const items =
    tab === "mentions"
      ? await getMentionFeed(session.domain.id, { before })
      : await getFeed(session.domain.id, { before });
  return Response.json({ items, tab });
}
