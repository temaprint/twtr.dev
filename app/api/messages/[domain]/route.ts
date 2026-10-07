import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains, messages } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { normalizeDomain } from "@/lib/domain";
import { serverSignature } from "@/lib/sign";
import { getThread } from "@/lib/messages";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 280;

async function peerFromParams(params: Promise<{ domain: string }>) {
  const { domain: raw } = await params;
  const name = normalizeDomain(decodeURIComponent(raw));
  if (!name) return null;
  const peer = (await db.select({ id: domains.id, name: domains.name }).from(domains).where(eq(domains.name, name)).limit(1))[0];
  return peer ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const peer = await peerFromParams(params);
  if (!peer) return Response.json({ error: "not_found" }, { status: 404 });
  if (peer.id === session.domain.id) {
    return Response.json({ error: "cannot_message_self" }, { status: 400 });
  }
  const thread = await getThread(session.domain.id, peer.id);
  return Response.json({ peer: peer.name, messages: thread });
}

export async function POST(req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`dm:${session.domain.id}`, 60, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const peer = await peerFromParams(params);
  if (!peer) return Response.json({ error: "not_found" }, { status: 404 });
  if (peer.id === session.domain.id) {
    return Response.json({ error: "cannot_message_self" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string") return Response.json({ error: "bad_request" }, { status: 400 });
  const trimmed = text.trim();
  if (!trimmed) return Response.json({ error: "empty" }, { status: 400 });
  if ([...trimmed].length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: "too_long" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date();
  const signature = serverSignature("message", id, session.domain.name, session.identity.id, createdAt, trimmed);

  await db.insert(messages).values({
    id,
    fromDomainId: session.domain.id,
    fromIdentityId: session.identity.id,
    toDomainId: peer.id,
    text: trimmed,
    signature,
    createdAt,
  });

  return Response.json({ ok: true, id });
}
