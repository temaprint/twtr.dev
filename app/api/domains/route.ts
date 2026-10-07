import { startChallenge } from "@/lib/verify";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!rateLimit(`connect:${clientIp(req)}`, 10, 60_000)) {
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

  const result = await startChallenge(domain);
  if ("error" in result) {
    return Response.json(result, { status: 400 });
  }
  return Response.json(result);
}
