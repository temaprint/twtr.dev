import { getSession } from "@/lib/session";
import { getInbox } from "@/lib/messages";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const inbox = await getInbox(session.domain.id);
  return Response.json({ inbox });
}
