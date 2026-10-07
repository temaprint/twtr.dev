import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPostWithReplies } from "@/lib/queries";
import { PostCard } from "@/components/PostCard";
import { Composer } from "@/components/Composer";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  const { id } = await params;
  const result = await getPostWithReplies(id);
  if (!result) notFound();
  const { post, replies } = result;

  return (
    <div>
      <div className="border-b border-border px-4 py-3 font-mono text-sm">
        <Link href="/home" className="text-muted hover:underline">
          ← Thread
        </Link>
      </div>

      {post.replyToId ? (
        <div className="border-b border-border bg-card px-4 py-2 text-sm text-muted">
          ↩ part of a thread by{" "}
          <Link href={`/${post.replyToAuthor}`} className="font-mono hover:underline">
            @{post.replyToAuthor}
          </Link>{" "}
          —{" "}
          <Link href={`/post/${post.replyToId}`} className="text-accent hover:underline">
            view parent
          </Link>
        </div>
      ) : null}

      <PostCard post={post} />

      {session ? (
        <Composer replyToId={post.id} placeholder={`Reply to @${post.author.name}`} autoFocus={false} />
      ) : (
        <div className="border-b border-border px-4 py-3 text-sm text-muted">
          <Link href="/connect?mode=login" className="text-accent hover:underline">
            Log in with your domain
          </Link>{" "}
          to reply.
        </div>
      )}

      {replies.length === 0 ? (
        <div className="px-4 py-8 text-center text-muted">No replies yet.</div>
      ) : (
        replies.map((reply) => <PostCard key={reply.id} post={reply} />)
      )}
    </div>
  );
}
