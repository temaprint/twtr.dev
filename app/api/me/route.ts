import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains } from "@/lib/schema";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(session);
}

const MAX_BIO = 200;

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const bio = (body as { bio?: unknown })?.bio;
  if (typeof bio !== "string") {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const trimmed = bio.trim();
  if (trimmed.length > MAX_BIO) {
    return Response.json({ error: "bio_too_long" }, { status: 400 });
  }

  await db
    .update(domains)
    .set({ bio: trimmed || null })
    .where(eq(domains.id, session.domain.id));

  return Response.json({ ok: true });
}
