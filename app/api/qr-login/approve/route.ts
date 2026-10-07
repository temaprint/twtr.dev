import { approveQrLogin } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Approve a QR sign-in request — requires an authenticated device. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`qr-approve:${ip}`, 20, 60_000)) {
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

  const result = await approveQrLogin(code);
  if (result.ok) return Response.json({ ok: true });
  if (result.error === "no_session") return Response.json({ error: "no_session" }, { status: 401 });
  return Response.json({ error: "invalid_code" }, { status: 400 });
}
