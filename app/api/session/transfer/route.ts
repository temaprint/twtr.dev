import { createTransferCode, getSession } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Issue a one-time code to transfer this session to another browser (QR). */
export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`transfer:${session.sessionId}`, 10, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const result = await createTransferCode();
  if (!result) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ code: result.code, expiresAt: result.expiresAt.toISOString() });
}
