import { getSession, listSessions } from "@/lib/session";
import { deviceName } from "@/lib/device";

export const runtime = "nodejs";

/** Browsers currently holding the active domain — the "active sessions" list. */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const items = await listSessions(session.domain.id, session.sessionId);
  return Response.json({
    sessions: items.map((s) => ({ ...s, device: deviceName(s.userAgent) })),
  });
}
