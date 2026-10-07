import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { normalizeDomain } from "@/lib/domain";
import { getThread } from "@/lib/messages";
import { MessageComposer } from "@/components/MessageComposer";
import { timeAgo } from "@/lib/time";

export default async function ThreadPage({ params }: { params: Promise<{ domain: string }> }) {
  const session = await getSession();
  if (!session) redirect("/connect");

  const { domain: raw } = await params;
  const name = normalizeDomain(decodeURIComponent(raw));
  if (!name || name === session.domain.name) notFound();

  const peer = (await db.select().from(domains).where(eq(domains.name, name)).limit(1))[0];
  if (!peer) notFound();

  const thread = await getThread(session.domain.id, peer.id);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-border px-4 py-3">
        <Link href="/messages" className="font-mono text-sm text-muted hover:underline">
          ← Messages
        </Link>
        <h1 className="mt-1 font-mono text-lg font-bold">{peer.name}</h1>
      </div>

      <div className="flex-1 space-y-3 px-4 py-4">
        {thread.length === 0 ? (
          <div className="py-10 text-center text-muted">No messages yet. Say hello as {session.domain.name}.</div>
        ) : (
          thread.map((m) => {
            const mine = m.fromName === session.domain.name;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                    mine ? "bg-accent text-accent-fg" : "bg-card"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  <div className={`mt-1 text-xs ${mine ? "text-accent-fg/70" : "text-muted"}`}>
                    {m.fingerprint} · {timeAgo(m.createdAt)}
                    {!m.isCurrentIdentity ? " · previous identity" : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="sticky bottom-16 border-t border-border md:bottom-0">
        <MessageComposer peer={peer.name} />
      </div>
    </div>
  );
}
