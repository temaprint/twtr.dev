import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains, identities, follows } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { normalizeDomain } from "@/lib/domain";
import { getDomainPosts } from "@/lib/queries";
import { PostCard } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";
import { IdentityEmoji, OpenIdentityHistoryOnHash } from "@/components/IdentityEmoji";
import { fullDate } from "@/lib/time";

export default async function DomainPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ before?: string }>;
}) {
  const session = await getSession();

  const { domain: raw } = await params;
  const { before } = await searchParams;
  const name = normalizeDomain(decodeURIComponent(raw));
  if (!name) notFound();

  const domain = (await db.select().from(domains).where(eq(domains.name, name)).limit(1))[0];
  if (!domain) notFound();

  const [current] = await db
    .select()
    .from(identities)
    .where(and(eq(identities.domainId, domain.id), isNull(identities.endedAt)))
    .limit(1);

  const history = await db
    .select()
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

  const isSelf = !!session && session.domain.id === domain.id;
  const isFollowing =
    session && !isSelf
      ? !!(
          await db
            .select({ x: follows.followerId })
            .from(follows)
            .where(and(eq(follows.followerId, session.domain.id), eq(follows.followedId, domain.id)))
            .limit(1)
        )[0]
      : false;

  const posts = await getDomainPosts(domain.id, { before });

  return (
    <div>
      <OpenIdentityHistoryOnHash />
      <div className="border-b border-border px-4 py-6">
        <h1 className="text-center font-mono text-xl font-bold">
          {domain.name}
          {current ? <> <IdentityEmoji fingerprint={current.fingerprint} /></> : null}
        </h1>
        {domain.bio ? <p className="mt-2 text-center text-muted">{domain.bio}</p> : null}
        <p className="mt-2 text-center text-sm text-muted">
          {Number(followers)} {Number(followers) === 1 ? "follower" : "followers"} · Following{" "}
          {Number(following)}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {isSelf ? (
            <Link
              href="/settings"
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-card"
            >
              Edit profile
            </Link>
          ) : session ? (
            <>
              <FollowButton domain={domain.name} initial={isFollowing} />
              <Link
                href={`/messages/${domain.name}`}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-card"
              >
                Message
              </Link>
            </>
          ) : (
            <Link
              href="/connect?mode=login"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              Log in to follow
            </Link>
          )}
        </div>
      </div>

      <details id="identity-history" className="scroll-mt-4 border-b border-border px-4 py-3">
        <summary className="cursor-pointer select-none text-sm text-muted">🔐 Identity history</summary>
        <div className="mt-3 space-y-3">
          {history.map((h) => (
            <div key={h.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={`tracking-wide ${h.endedAt ? "text-muted" : ""}`}>{h.fingerprint}</span>
              <span className="text-sm text-muted">
                {fullDate(h.startedAt)} → {h.endedAt ? fullDate(h.endedAt) : "present"}
              </span>
              {h.changeType === "access_changed" ? (
                <span className="text-sm text-muted">🔐 Domain access changed</span>
              ) : null}
            </div>
          ))}
          <p className="text-sm text-muted">
            The DNS verification record was changed between identities. Posts keep the fingerprint of the
            identity they were published under.
          </p>
        </div>
      </details>

      {posts.length === 0 ? (
        <div className="px-4 py-10 text-center text-muted">No posts yet.</div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}

      {posts.length === 30 ? (
        <Link
          href={`/${domain.name}?before=${posts[posts.length - 1].id}`}
          className="block px-4 py-3 text-center text-sm text-accent hover:bg-card"
        >
          Older posts
        </Link>
      ) : null}
    </div>
  );
}
