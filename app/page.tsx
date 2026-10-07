import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getLatestPosts } from "@/lib/queries";
import { PostCard } from "@/components/PostCard";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/home");

  const posts = await getLatestPosts({ limit: 20 });

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <Link href="/" className="font-mono text-lg font-bold">
          twtr.dev
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/docs" className="px-2 py-1.5 text-sm font-medium hover:underline">
            Docs
          </Link>
          <Link
            href="/connect?mode=login"
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-card"
          >
            Log in
          </Link>
          <Link
            href="/connect"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Join
          </Link>
        </div>
      </header>

      <section className="border-b border-border px-6 py-12 text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          The web already has identities.
          <br />
          <span className="text-muted">We just never used them.</span>
        </h1>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/connect"
            className="rounded-full bg-accent px-6 py-2.5 font-medium text-accent-fg hover:opacity-90"
          >
            Join with your domain
          </Link>
          <Link
            href="/connect?mode=login"
            className="rounded-full border border-border px-6 py-2.5 font-medium hover:bg-card"
          >
            Log in
          </Link>
        </div>

        <p className="mt-6 font-mono text-sm text-muted">domain → DNS TXT → identity</p>
      </section>

      <section>
        <h2 className="border-b border-border px-4 py-3 font-mono text-lg font-bold">Latest posts</h2>
        {posts.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted">
            No posts yet.{" "}
            <Link href="/connect" className="text-accent hover:underline">
              Be the first domain
            </Link>
            .
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted">
        No usernames. No emails. No phone numbers.
        <br />
        Your domain is your identity.{" "}
        <Link href="/docs" className="text-accent hover:underline">
          Read the docs →
        </Link>
      </footer>
    </div>
  );
}
