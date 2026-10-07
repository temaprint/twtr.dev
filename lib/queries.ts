import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "./db";
import { posts, domains, identities, follows, mentions } from "./schema";

export interface PostView {
  id: string;
  text: string;
  createdAt: string; // ISO
  author: { name: string };
  fingerprint: string;
  /** true if authored under the domain's *current* identity */
  isCurrentIdentity: boolean;
  replyToId: string | null;
  replyToAuthor: string | null;
  replyCount: number;
}

interface PostRow {
  id: string;
  text: string;
  createdAt: Date;
  authorName: string;
  fingerprint: string;
  authorIdentityId: string;
  authorDomainId: string;
  replyToId: string | null;
}

const postSelection = {
  id: posts.id,
  text: posts.text,
  createdAt: posts.createdAt,
  authorName: domains.name,
  fingerprint: identities.fingerprint,
  authorIdentityId: posts.authorIdentityId,
  authorDomainId: posts.authorDomainId,
  replyToId: posts.replyToId,
} as const;

async function hydrate(rows: PostRow[]): Promise<PostView[]> {
  if (rows.length === 0) return [];
  const domainIds = [...new Set(rows.map((r) => r.authorDomainId))];
  const postIds = rows.map((r) => r.id);

  const currentIdentities = await db
    .select({ domainId: identities.domainId, id: identities.id })
    .from(identities)
    .where(and(inArray(identities.domainId, domainIds), isNull(identities.endedAt)));
  const currentByDomain = new Map(currentIdentities.map((i) => [i.domainId, i.id]));

  const replyTargets = [...new Set(rows.filter((r) => r.replyToId).map((r) => r.replyToId!))];
  const replyAuthors = replyTargets.length
    ? await db
        .select({ id: posts.id, name: domains.name })
        .from(posts)
        .innerJoin(domains, eq(posts.authorDomainId, domains.id))
        .where(inArray(posts.id, replyTargets))
    : [];
  const replyAuthorById = new Map(replyAuthors.map((r) => [r.id, r.name]));

  const counts = await db
    .select({ replyToId: posts.replyToId, count: sql<number>`count(*)` })
    .from(posts)
    .where(inArray(posts.replyToId, postIds))
    .groupBy(posts.replyToId);
  const countByParent = new Map(counts.filter((c) => c.replyToId).map((c) => [c.replyToId as string, c.count]));

  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    createdAt: r.createdAt.toISOString(),
    author: { name: r.authorName },
    fingerprint: r.fingerprint,
    isCurrentIdentity: currentByDomain.get(r.authorDomainId) === r.authorIdentityId,
    replyToId: r.replyToId,
    replyToAuthor: r.replyToId ? (replyAuthorById.get(r.replyToId) ?? null) : null,
    replyCount: countByParent.get(r.id) ?? 0,
  }));
}

/** Feed: posts from followed domains + own, newest first. */
export async function getFeed(
  viewerDomainId: string,
  opts: { before?: string; limit?: number } = {}
): Promise<PostView[]> {
  const limit = opts.limit ?? 30;
  let beforeDate: Date | null = null;
  if (opts.before) {
    const anchor = (await db.select({ createdAt: posts.createdAt }).from(posts).where(eq(posts.id, opts.before)).limit(1))[0];
    if (!anchor) return [];
    beforeDate = anchor.createdAt;
  }

  const followedSub = db
    .select({ id: follows.followedId })
    .from(follows)
    .where(eq(follows.followerId, viewerDomainId));

  const rows = await db
    .select(postSelection)
    .from(posts)
    .innerJoin(domains, eq(posts.authorDomainId, domains.id))
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(
      and(
        or(eq(posts.authorDomainId, viewerDomainId), inArray(posts.authorDomainId, followedSub)),
        beforeDate ? lt(posts.createdAt, beforeDate) : undefined
      )
    )
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit);
  return hydrate(rows);
}

/** Posts mentioning the viewer. */
export async function getMentionFeed(
  viewerDomainId: string,
  opts: { before?: string; limit?: number } = {}
): Promise<PostView[]> {
  const limit = opts.limit ?? 30;
  let beforeDate: Date | null = null;
  if (opts.before) {
    const anchor = (await db.select({ createdAt: posts.createdAt }).from(posts).where(eq(posts.id, opts.before)).limit(1))[0];
    if (!anchor) return [];
    beforeDate = anchor.createdAt;
  }

  const rows = await db
    .select(postSelection)
    .from(posts)
    .innerJoin(mentions, eq(mentions.postId, posts.id))
    .innerJoin(domains, eq(posts.authorDomainId, domains.id))
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(
      and(
        eq(mentions.domainId, viewerDomainId),
        beforeDate ? lt(posts.createdAt, beforeDate) : undefined
      )
    )
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit);
  // dedupe (a post mentioning the viewer twice would join twice)
  const seen = new Set<string>();
  const unique = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  return hydrate(unique);
}

/** A domain's top-level posts (profile timeline). */
export async function getDomainPosts(
  domainId: string,
  opts: { before?: string; limit?: number } = {}
): Promise<PostView[]> {
  const limit = opts.limit ?? 30;
  let beforeDate: Date | null = null;
  if (opts.before) {
    const anchor = (await db.select({ createdAt: posts.createdAt }).from(posts).where(eq(posts.id, opts.before)).limit(1))[0];
    if (!anchor) return [];
    beforeDate = anchor.createdAt;
  }

  const rows = await db
    .select(postSelection)
    .from(posts)
    .innerJoin(domains, eq(posts.authorDomainId, domains.id))
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(
      and(
        eq(posts.authorDomainId, domainId),
        isNull(posts.replyToId),
        beforeDate ? lt(posts.createdAt, beforeDate) : undefined
      )
    )
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit);
  return hydrate(rows);
}

/** Global public timeline: top-level posts across all domains, newest first. */
export async function getLatestPosts(opts: { before?: string; limit?: number } = {}): Promise<PostView[]> {
  const limit = opts.limit ?? 30;
  let beforeDate: Date | null = null;
  if (opts.before) {
    const anchor = (await db.select({ createdAt: posts.createdAt }).from(posts).where(eq(posts.id, opts.before)).limit(1))[0];
    if (!anchor) return [];
    beforeDate = anchor.createdAt;
  }

  const rows = await db
    .select(postSelection)
    .from(posts)
    .innerJoin(domains, eq(posts.authorDomainId, domains.id))
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(and(isNull(posts.replyToId), beforeDate ? lt(posts.createdAt, beforeDate) : undefined))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit);
  return hydrate(rows);
}

/** One post + its direct replies (thread view). */
export async function getPostWithReplies(id: string): Promise<{ post: PostView; replies: PostView[] } | null> {
  const rows = await db
    .select(postSelection)
    .from(posts)
    .innerJoin(domains, eq(posts.authorDomainId, domains.id))
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(eq(posts.id, id))
    .limit(1);
  if (!rows[0]) return null;

  const replyRows = await db
    .select(postSelection)
    .from(posts)
    .innerJoin(domains, eq(posts.authorDomainId, domains.id))
    .innerJoin(identities, eq(posts.authorIdentityId, identities.id))
    .where(eq(posts.replyToId, id))
    .orderBy(posts.createdAt, posts.id);

  const [post] = await hydrate(rows);
  const replies = await hydrate(replyRows);
  return { post, replies };
}
