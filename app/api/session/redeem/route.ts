import { redeemTransferCode } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Redeem a transfer code in a new browser. The code itself is the
 * credential (32 random bytes, hashed at rest, single use, 5-minute TTL),
 * so no session is required here.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`redeem:${ip}`, 20, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const code = (body as { code?: string })?.code;
  if (typeof code !== "string" || code.length > 200) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await redeemTransferCode(code, req.headers.get("user-agent"));
  if (!result) return Response.json({ error: "invalid_code" }, { status: 400 });
  return Response.json({ ok: true, domains: result.domains });
}
