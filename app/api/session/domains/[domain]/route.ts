import { disconnectDomain } from "@/lib/session";

export const runtime = "nodejs";

/** Remove a domain from this browser session. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const result = await disconnectDomain(decodeURIComponent(domain));
  if (!result) return Response.json({ error: "not_in_session" }, { status: 400 });
  return Response.json({ ok: true, remaining: result.remaining });
}
