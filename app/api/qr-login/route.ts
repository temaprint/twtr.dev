import { createQrLogin, pollQrLogin } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * QR sign-in from the login page. The code is the only credential (hashed
 * at rest, single use, 5-minute TTL) — same trust model as transfer codes.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`qr-create:${ip}`, 10, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const { code, expiresAt } = await createQrLogin(req.headers.get("user-agent"));
  return Response.json({ ok: true, code, expiresAt });
}

/** Poll a QR sign-in request; a successful poll sets the session cookie. */
export async function GET(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`qr-poll:${ip}`, 120, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  if (!code || code.length > 200) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const result = await pollQrLogin(code, req.headers.get("user-agent"));
  if (result.status === "ok") return Response.json({ status: "ok", domains: result.domains });
  return Response.json({ status: result.status });
}
