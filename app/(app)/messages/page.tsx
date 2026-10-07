import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInbox } from "@/lib/messages";
import { timeAgo } from "@/lib/time";

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect("/connect");
  const inbox = await getInbox(session.domain.id);

  return (
    <div>
      <div className="border-b border-border px-4 py-3">
        <h1 className="font-mono text-lg font-bold">Messages</h1>
      </div>

      {inbox.length === 0 ? (
        <div className="px-4 py-10 text-center text-muted">
          No conversations yet. Open a domain profile and press Message.
        </div>
      ) : (
        inbox.map((conv) => {
          const peer = conv.fromName === session.domain.name ? conv.toName : conv.fromName;
          return (
            <Link
              key={conv.id}
              href={`/messages/${peer}`}
              className="block border-b border-border px-4 py-3 hover:bg-card"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{peer}</span>
                {conv.unreadCount > 0 ? (
                  <span className="rounded-full bg-accent px-1.5 text-xs leading-5 text-accent-fg">
                    {conv.unreadCount}
                  </span>
                ) : null}
                <span className="ml-auto text-sm text-muted">{timeAgo(conv.createdAt)}</span>
              </div>
              <div className={`mt-0.5 truncate text-sm ${conv.unreadCount > 0 ? "" : "text-muted"}`}>
                {conv.fromName === session.domain.name ? "You: " : ""}
                {conv.text}
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
