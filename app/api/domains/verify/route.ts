import { verifyDomain } from "@/lib/verify";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`verify:${ip}`, 15, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const domain = (body as { domain?: string })?.domain;
  if (typeof domain !== "string") {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!rateLimit(`verify-domain:${domain.toLowerCase()}`, 10, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const result = await verifyDomain(domain, req.headers.get("user-agent"));
  if (!result.ok) {
    // not_found / no_matching_challenge are expected while DNS propagates — 202 keeps clients polling calmly
    const status =
      result.error === "invalid_domain" || result.error === "unknown_domain" ? 400 : 202;
    return Response.json(result, { status });
  }
  return Response.json(result);
}
