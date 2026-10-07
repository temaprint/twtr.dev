import { and, desc, eq, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "./db";
import { messages, domains, identities } from "./schema";

export interface MessageView {
  id: string;
  text: string;
  createdAt: string; // ISO
  fromName: string;
  toName: string;
  fingerprint: string;
  isCurrentIdentity: boolean;
  unread: boolean;
}

/** Inbox: latest message per conversation partner, with unread counts. */
export async function getInbox(myDomainId: string): Promise<(MessageView & { unreadCount: number })[]> {
  const fromDomain = alias(domains, "from_domain");
  const toDomain = alias(domains, "to_domain");

  const rows = await db
    .select({
      id: messages.id,
      text: messages.text,
      createdAt: messages.createdAt,
      fromId: messages.fromDomainId,
      fromName: fromDomain.name,
      toName: toDomain.name,
      fingerprint: identities.fingerprint,
      senderIdentityId: messages.fromIdentityId,
      senderDomainId: messages.fromDomainId,
      readAt: messages.readAt,
    })
    .from(messages)
    .innerJoin(fromDomain, eq(messages.fromDomainId, fromDomain.id))
    .innerJoin(toDomain, eq(messages.toDomainId, toDomain.id))
    .innerJoin(identities, eq(messages.fromIdentityId, identities.id))
    .where(or(eq(messages.fromDomainId, myDomainId), eq(messages.toDomainId, myDomainId)))
    .orderBy(desc(messages.createdAt), desc(messages.id));

  // Current-identity map for fingerprint freshness
  const currentByDomain = new Map<string, string>();
  for (const row of rows) {
    if (currentByDomain.has(row.senderDomainId)) continue;
    const cur = (
      await db
        .select({ id: identities.id })
        .from(identities)
        .where(and(eq(identities.domainId, row.senderDomainId), isNull(identities.endedAt)))
        .limit(1)
    )[0];
    if (cur) currentByDomain.set(row.senderDomainId, cur.id);
  }

  interface Conv {
    view: MessageView;
    peerId: string;
    unread: number;
  }
  const convs = new Map<string, Conv>();
  for (const r of rows) {
    const peerId = r.fromId === myDomainId ? r.toName : r.fromName;
    const unreadInc = r.fromId !== myDomainId && !r.readAt ? 1 : 0;
    const existing = convs.get(peerId);
    if (existing) {
      existing.unread += unreadInc;
    } else {
      convs.set(peerId, {
        peerId,
        unread: unreadInc,
        view: {
          id: r.id,
          text: r.text,
          createdAt: r.createdAt.toISOString(),
          fromName: r.fromName,
          toName: r.toName,
          fingerprint: r.fingerprint,
          isCurrentIdentity: currentByDomain.get(r.senderDomainId) === r.senderIdentityId,
          unread: unreadInc > 0,
        },
      });
    }
  }
  return [...convs.values()].map((c) => ({ ...c.view, unreadCount: c.unread }));
}

/** Full thread with a peer, oldest first. Marks incoming messages read. */
export async function getThread(myDomainId: string, peerDomainId: string): Promise<MessageView[]> {
  const fromDomain = alias(domains, "from_domain");
  const toDomain = alias(domains, "to_domain");

  const rows = await db
    .select({
      id: messages.id,
      text: messages.text,
      createdAt: messages.createdAt,
      fromId: messages.fromDomainId,
      fromName: fromDomain.name,
      toName: toDomain.name,
      fingerprint: identities.fingerprint,
      senderIdentityId: messages.fromIdentityId,
      readAt: messages.readAt,
    })
    .from(messages)
    .innerJoin(fromDomain, eq(messages.fromDomainId, fromDomain.id))
    .innerJoin(toDomain, eq(messages.toDomainId, toDomain.id))
    .innerJoin(identities, eq(messages.fromIdentityId, identities.id))
    .where(
      or(
        and(eq(messages.fromDomainId, myDomainId), eq(messages.toDomainId, peerDomainId)),
        and(eq(messages.fromDomainId, peerDomainId), eq(messages.toDomainId, myDomainId))
      )
    )
    .orderBy(messages.createdAt, messages.id);

  // current identity per sender domain (mine and the peer's)
  const currentByDomain = new Map<string, string>();
  for (const domainId of new Set([myDomainId, peerDomainId])) {
    const cur = (
      await db
        .select({ id: identities.id })
        .from(identities)
        .where(and(eq(identities.domainId, domainId), isNull(identities.endedAt)))
        .limit(1)
    )[0];
    if (cur) currentByDomain.set(domainId, cur.id);
  }

  // mark incoming unread as read
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.toDomainId, myDomainId),
        eq(messages.fromDomainId, peerDomainId),
        isNull(messages.readAt)
      )
    );

  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    createdAt: r.createdAt.toISOString(),
    fromName: r.fromName,
    toName: r.toName,
    fingerprint: r.fingerprint,
    isCurrentIdentity: currentByDomain.get(r.fromId) === r.senderIdentityId,
    unread: r.fromId !== myDomainId && !r.readAt,
  }));
}
