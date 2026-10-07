import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains, identities, follows } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { normalizeDomain } from "@/lib/domain";
import { getDomainPosts } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { domain: raw } = await params;
  const name = normalizeDomain(decodeURIComponent(raw));
  if (!name) return Response.json({ error: "not_found" }, { status: 404 });

  const domain = (await db.select().from(domains).where(eq(domains.name, name)).limit(1))[0];
  if (!domain) return Response.json({ error: "not_found" }, { status: 404 });

  const url = new URL(req.url);
  const before = url.searchParams.get("before") ?? undefined;

  const [currentIdentity] = await db
    .select()
    .from(identities)
    .where(and(eq(identities.domainId, domain.id), isNull(identities.endedAt)))
    .limit(1);

  const history = await db
    .select({
      id: identities.id,
      fingerprint: identities.fingerprint,
      changeType: identities.changeType,
      startedAt: identities.startedAt,
      endedAt: identities.endedAt,
    })
    .from(identities)
    .where(eq(identities.domainId, domain.id))
    .orderBy(desc(identities.startedAt));

  const [{ followers }] = await db
    .select({ followers: sql<number>`count(*)` })
    .from(follows)
    .where(eq(follows.followedId, domain.id));
  const [{ following }] = await db
    .select({ following: sql<number>`count(*)` })
    .from(follows)
    .where(eq(follows.followerId, domain.id));

  const session = await getSession();
  const isSelf = session?.domain.id === domain.id;
  let isFollowing = false;
  if (session && !isSelf) {
    const row = (
      await db
        .select({ x: follows.followerId })
        .from(follows)
        .where(and(eq(follows.followerId, session.domain.id), eq(follows.followedId, domain.id)))
        .limit(1)
    )[0];
    isFollowing = !!row;
  }

  const posts = await getDomainPosts(domain.id, { before });

  return Response.json({
    domain: { name: domain.name, bio: domain.bio, createdAt: domain.createdAt.toISOString() },
    currentIdentity: currentIdentity
      ? { fingerprint: currentIdentity.fingerprint, startedAt: currentIdentity.startedAt.toISOString() }
      : null,
    identityHistory: history.map((h) => ({
      fingerprint: h.fingerprint,
      changeType: h.changeType,
      startedAt: h.startedAt.toISOString(),
      endedAt: h.endedAt?.toISOString() ?? null,
    })),
    followers: Number(followers),
    following: Number(following),
    viewer: isSelf ? "self" : session ? (isFollowing ? "following" : "none") : "anonymous",
    posts,
  });
}
