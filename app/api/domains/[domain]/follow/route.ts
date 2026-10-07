import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains, follows } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { normalizeDomain } from "@/lib/domain";

export const runtime = "nodejs";

async function resolveBoth(raw: string) {
  const name = normalizeDomain(decodeURIComponent(raw));
  if (!name) return null;
  const target = (await db.select({ id: domains.id }).from(domains).where(eq(domains.name, name)).limit(1))[0];
  return target ?? null;
}

export async function POST(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { domain: raw } = await params;
  const target = await resolveBoth(raw);
  if (!target) return Response.json({ error: "not_found" }, { status: 404 });
  if (target.id === session.domain.id) {
    return Response.json({ error: "cannot_follow_self" }, { status: 400 });
  }
  await db
    .insert(follows)
    .values({ followerId: session.domain.id, followedId: target.id })
    .onConflictDoNothing();
  return Response.json({ ok: true, following: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { domain: raw } = await params;
  const target = await resolveBoth(raw);
  if (!target) return Response.json({ error: "not_found" }, { status: 404 });
  await db
    .delete(follows)
    .where(and(eq(follows.followerId, session.domain.id), eq(follows.followedId, target.id)));
  return Response.json({ ok: true, following: false });
}
