import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, domains, mentions } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { serverSignature } from "@/lib/sign";
import { parseMentions } from "@/lib/mentions";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export const MAX_POST_LENGTH = 280;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`post:${session.domain.id}`, 30, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const { text, replyToId } = (body as { text?: unknown; replyToId?: unknown }) ?? {};
  if (typeof text !== "string" || (replyToId !== undefined && replyToId !== null && typeof replyToId !== "string")) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const trimmed = text.trim();
  if (!trimmed) return Response.json({ error: "empty" }, { status: 400 });
  if ([...trimmed].length > MAX_POST_LENGTH) {
    return Response.json({ error: "too_long" }, { status: 400 });
  }

  if (replyToId) {
    const parent = (await db.select({ id: posts.id }).from(posts).where(eq(posts.id, replyToId)).limit(1))[0];
    if (!parent) return Response.json({ error: "parent_not_found" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date();
  const signature = serverSignature(
    "post",
    id,
    session.domain.name,
    session.identity.id,
    createdAt,
    trimmed
  );

  await db.insert(posts).values({
    id,
    authorDomainId: session.domain.id,
    authorIdentityId: session.identity.id,
    text: trimmed,
    replyToId: replyToId ?? null,
    signature,
    createdAt,
  });

  const mentionNames = parseMentions(trimmed);
  if (mentionNames.length > 0) {
    const known = await db
      .select({ id: domains.id, name: domains.name })
      .from(domains)
      .where(inArray(domains.name, mentionNames));
    if (known.length > 0) {
      await db
        .insert(mentions)
        .values(known.map((d) => ({ postId: id, domainId: d.id })))
        .onConflictDoNothing();
    }
  }

  return Response.json({ ok: true, id });
}
