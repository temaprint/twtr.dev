import Link from "next/link";
import { PostText } from "./PostText";
import { FollowButton } from "./FollowButton";
import { timeAgo } from "@/lib/time";
import type { PostView } from "@/lib/queries";

export function PostCard({
  post,
  followInitial = null,
}: {
  post: PostView;
  /** null = no follow control; true/false = button state */
  followInitial?: boolean | null;
}) {
  const firstEmoji = post.fingerprint.split(/\s+/)[0] ?? "";
  return (
    <article className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/${post.author.name}`} className="font-mono font-semibold hover:underline">
          {post.author.name}
        </Link>
        <Link
          href={`/${post.author.name}#identity-history`}
          title={
            post.isCurrentIdentity
              ? "Identity history"
              : "Authored under a previous identity — fingerprint preserved"
          }
          aria-label="Identity history"
          className={`hover:opacity-60 ${post.isCurrentIdentity ? "" : "text-muted"}`}
        >
          {firstEmoji}
        </Link>
        {followInitial !== null ? (
          <span className="ml-auto">
            <FollowButton domain={post.author.name} initial={followInitial} small />
          </span>
        ) : null}
        <span className={`text-muted ${followInitial !== null ? "" : "ml-auto"}`}>{timeAgo(post.createdAt)}</span>
      </div>

      {post.replyToAuthor ? (
        <div className="mt-0.5 text-sm text-muted">
          ↩ replying to{" "}
          <Link href={`/${post.replyToAuthor}`} className="font-mono hover:underline">
            @{post.replyToAuthor}
          </Link>
        </div>
      ) : null}

      <div className="mt-1.5 leading-relaxed">
        <PostText text={post.text} />
      </div>

      <div className="mt-2 text-sm text-muted">
        <Link href={`/post/${post.id}`} className="hover:underline">
          {post.replyCount > 0 ? `${post.replyCount} ${post.replyCount === 1 ? "reply" : "replies"}` : "reply"}
        </Link>
      </div>
    </article>
  );
}
