import { getSession, revokeSession } from "@/lib/session";

export const runtime = "nodejs";

/** Revoke another browser's session (it holds the caller's domain). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await revokeSession(id, session.domain.id);
  if (!ok) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ok: true });
}
