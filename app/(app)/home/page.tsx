import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { follows, domains } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { getFeed, getMentionFeed, getLatestPosts } from "@/lib/queries";
import { Composer } from "@/components/Composer";
import { PostCard } from "@/components/PostCard";

const TABS = [
  { key: "global", label: "Global" },
  { key: "following", label: "Following" },
  { key: "mentions", label: "Mentions" },
] as const;

function TabBar({ active }: { active: string }) {
  return (
    <div className="flex border-b border-border">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/home?tab=${t.key}`}
          className={`flex-1 py-3 text-center text-sm font-medium hover:bg-card ${
            tabKey(active) === t.key ? "border-b-2 border-accent" : "text-muted"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

const tabKey = (raw: string | undefined) =>
  raw === "following" || raw === "mentions" ? raw : "global";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; before?: string }>;
}) {
  const session = await getSession();
  const { tab, before } = await searchParams;

  // Visitors see the public global timeline.
  if (!session) {
    const posts = await getLatestPosts({ before });
    return (
      <div>
        <div className="border-b border-border px-4 py-3">
          <h1 className="font-mono text-lg font-bold">Latest posts</h1>
          <p className="mt-0.5 text-sm text-muted">
            Public timeline —{" "}
            <Link href="/connect" className="text-accent hover:underline">
              join with your domain
            </Link>{" "}
            to post, follow and reply.
          </p>
        </div>
        {posts.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted">No posts yet.</div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
        {posts.length === 30 ? (
          <Link
            href={`/home?before=${posts[posts.length - 1].id}`}
            className="block px-4 py-3 text-center text-sm text-accent hover:bg-card"
          >
            Older posts
          </Link>
        ) : null}
      </div>
    );
  }

  const active = tabKey(tab);

  if (active === "mentions") {
    const items = await getMentionFeed(session.domain.id, { before });
    return (
      <div>
        <TabBar active={active} />
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted">
            No mentions yet. When a domain mentions you in a post, it shows up here.
          </div>
        ) : (
          items.map((post) => <PostCard key={post.id} post={post} />)
        )}
        {items.length === 30 ? (
          <Link
            href={`/home?tab=mentions&before=${items[items.length - 1].id}`}
            className="block px-4 py-3 text-center text-sm text-accent hover:bg-card"
          >
            Older posts
          </Link>
        ) : null}
      </div>
    );
  }

  if (active === "following") {
    const items = await getFeed(session.domain.id, { before });
    return (
      <div>
        <TabBar active={active} />
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted">
            You don&apos;t follow anyone yet. Follow domains from the Global tab or their profiles — their
            posts will show up here.
          </div>
        ) : (
          items.map((post) => <PostCard key={post.id} post={post} />)
        )}
        {items.length === 30 ? (
          <Link
            href={`/home?tab=following&before=${items[items.length - 1].id}`}
            className="block px-4 py-3 text-center text-sm text-accent hover:bg-card"
          >
            Older posts
          </Link>
        ) : null}
      </div>
    );
  }

  // Global: the whole public timeline, with follow controls on other
  // domains' posts.
  const posts = await getLatestPosts({ before });
  const followedRows = await db
    .select({ name: domains.name })
    .from(follows)
    .innerJoin(domains, eq(follows.followedId, domains.id))
    .where(eq(follows.followerId, session.domain.id));
  const followed = new Set(followedRows.map((r) => r.name));

  return (
    <div>
      <TabBar active={active} />
      <Composer />
      {posts.length === 0 ? (
        <div className="px-4 py-10 text-center text-muted">No posts yet.</div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            followInitial={
              post.author.name === session.domain.name ? null : followed.has(post.author.name)
            }
          />
        ))
      )}
      {posts.length === 30 ? (
        <Link
          href={`/home?tab=global&before=${posts[posts.length - 1].id}`}
          className="block px-4 py-3 text-center text-sm text-accent hover:bg-card"
        >
          Older posts
        </Link>
      ) : null}
    </div>
  );
}
