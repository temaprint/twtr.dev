import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { sessions, sessionDomains, sessionTransfers, qrLogins, identities, domains } from "./schema";
import { deviceName } from "./device";

const COOKIE_NAME = "twtr_session";
const SESSION_TTL_MS = 90 * 24 * 3600 * 1000; // 90 days — re-verification via DNS is rare by design
const TRANSFER_TTL_MS = 5 * 60 * 1000; // QR transfer codes live five minutes
const LAST_SEEN_THROTTLE_MS = 3600 * 1000; // touch last_seen at most hourly
const QR_LOGIN_TTL_MS = 5 * 60 * 1000; // QR sign-in requests live five minutes
const QR_LOGIN_CLEANUP_MS = 3600 * 1000; // purge finished/stale QR logins after an hour

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface SessionDomain {
  id: string;
  name: string;
  fingerprint: string;
}

export interface SessionInfo {
  sessionId: string;
  domain: { id: string; name: string; bio: string | null };
  identity: { id: string; fingerprint: string; startedAt: Date; token: string; changeType: string };
  /** every verified domain available in this browser */
  domains: SessionDomain[];
}

async function setCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

async function sessionByCookie() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return session ?? null;
}

export async function createSession(domainId: string, identityId: string, userAgent?: string | null): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const id = crypto.randomUUID();
  await db.insert(sessions).values({
    id,
    tokenHash: sha256(token),
    activeDomainId: domainId,
    userAgent: userAgent ?? null,
    expiresAt,
  });
  await db.insert(sessionDomains).values({ sessionId: id, domainId, identityId, addedAt: new Date() });
  await setCookie(token, expiresAt);
}

/**
 * Attach a freshly verified domain to the *current* browser session.
 * Returns null when there is no session to attach to.
 * `multi` is true when the session already held other domains.
 */
export async function attachDomain(
  domainId: string,
  identityId: string
): Promise<{ multi: boolean } | null> {
  const session = await sessionByCookie();
  if (!session) return null;

  const existing = await db
    .select({ domainId: sessionDomains.domainId })
    .from(sessionDomains)
    .where(eq(sessionDomains.sessionId, session.id));
  const multi = existing.some((b) => b.domainId !== domainId);

  await db
    .insert(sessionDomains)
    .values({ sessionId: session.id, domainId, identityId, addedAt: new Date() })
    .onConflictDoUpdate({
      target: [sessionDomains.sessionId, sessionDomains.domainId],
      set: { identityId, addedAt: new Date() },
    });
  await db.update(sessions).set({ activeDomainId: domainId }).where(eq(sessions.id, session.id));
  return { multi };
}

/** Attach to the current session if any, otherwise create a new one. */
export async function sessionFor(
  domainId: string,
  identityId: string,
  userAgent?: string | null
): Promise<{ multi: boolean }> {
  const attached = await attachDomain(domainId, identityId);
  if (attached) return attached;
  await createSession(domainId, identityId, userAgent);
  return { multi: false };
}

/**
 * Resolve the current session. Bindings whose identity has ended (the DNS
 * record changed elsewhere) are dropped — a new owner of one domain never
 * inherits the rest of the browser session. A session with no live bindings
 * is deleted.
 */
export async function getSession(): Promise<SessionInfo | null> {
  const session = await sessionByCookie();
  if (!session) return null;

  const bindings = await db
    .select({
      domainId: sessionDomains.domainId,
      identityId: sessionDomains.identityId,
      addedAt: sessionDomains.addedAt,
      name: domains.name,
      bio: domains.bio,
      fingerprint: identities.fingerprint,
      startedAt: identities.startedAt,
      token: identities.token,
      changeType: identities.changeType,
      endedAt: identities.endedAt,
    })
    .from(sessionDomains)
    .innerJoin(domains, eq(sessionDomains.domainId, domains.id))
    .innerJoin(identities, eq(sessionDomains.identityId, identities.id))
    .where(eq(sessionDomains.sessionId, session.id))
    .orderBy(desc(sessionDomains.addedAt));

  const stale = bindings.filter((b) => b.endedAt !== null);
  if (stale.length > 0) {
    await db
      .delete(sessionDomains)
      .where(
        and(
          eq(sessionDomains.sessionId, session.id),
          inArray(
            sessionDomains.domainId,
            stale.map((s) => s.domainId)
          )
        )
      );
  }

  const live = bindings.filter((b) => b.endedAt === null);
  if (live.length === 0) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }

  if (!session.lastSeenAt || Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, session.id));
  }

  const active = live.find((b) => b.domainId === session.activeDomainId) ?? live[0];

  return {
    sessionId: session.id,
    domain: { id: active.domainId, name: active.name, bio: active.bio },
    identity: {
      id: active.identityId,
      fingerprint: active.fingerprint,
      startedAt: active.startedAt,
      token: active.token,
      changeType: active.changeType,
    },
    domains: live.map((b) => ({ id: b.domainId, name: b.name, fingerprint: b.fingerprint })),
  };
}

export async function switchActiveDomain(domainName: string): Promise<boolean> {
  const session = await sessionByCookie();
  if (!session) return false;
  const [row] = await db
    .select({ domainId: domains.id })
    .from(sessionDomains)
    .innerJoin(domains, eq(sessionDomains.domainId, domains.id))
    .where(and(eq(sessionDomains.sessionId, session.id), eq(domains.name, domainName.toLowerCase())))
    .limit(1);
  if (!row) return false;
  await db.update(sessions).set({ activeDomainId: row.domainId }).where(eq(sessions.id, session.id));
  return true;
}

/** Remove a domain from this browser session; kills the session if it was the last one. */
export async function disconnectDomain(
  domainName: string
): Promise<{ remaining: number } | null> {
  const session = await sessionByCookie();
  if (!session) return null;
  const [row] = await db
    .select({ domainId: domains.id })
    .from(sessionDomains)
    .innerJoin(domains, eq(sessionDomains.domainId, domains.id))
    .where(and(eq(sessionDomains.sessionId, session.id), eq(domains.name, domainName.toLowerCase())))
    .limit(1);
  if (!row) return null;

  await db
    .delete(sessionDomains)
    .where(and(eq(sessionDomains.sessionId, session.id), eq(sessionDomains.domainId, row.domainId)));

  const rest = await db
    .select({ domainId: sessionDomains.domainId })
    .from(sessionDomains)
    .where(eq(sessionDomains.sessionId, session.id));

  if (rest.length === 0) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    const store = await cookies();
    store.delete(COOKIE_NAME);
    return { remaining: 0 };
  }
  if (row.domainId === session.activeDomainId) {
    await db.update(sessions).set({ activeDomainId: rest[0].domainId }).where(eq(sessions.id, session.id));
  }
  return { remaining: rest.length };
}

export interface SessionListItem {
  id: string;
  createdAt: string;
  lastSeenAt: string | null;
  userAgent: string | null;
  domains: string[];
  current: boolean;
}

/** Sessions (browsers) that currently hold the given domain with a live identity. */
export async function listSessions(domainId: string, currentSessionId: string): Promise<SessionListItem[]> {
  const holders = await db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      userAgent: sessions.userAgent,
    })
    .from(sessionDomains)
    .innerJoin(sessions, eq(sessionDomains.sessionId, sessions.id))
    .innerJoin(identities, eq(sessionDomains.identityId, identities.id))
    .where(
      and(
        eq(sessionDomains.domainId, domainId),
        gt(sessions.expiresAt, new Date()),
        isNull(identities.endedAt)
      )
    )
    .orderBy(desc(sessions.lastSeenAt));

  if (holders.length === 0) return [];

  // full domain lists for those sessions (live bindings only)
  const rows = await db
    .select({ sessionId: sessionDomains.sessionId, name: domains.name })
    .from(sessionDomains)
    .innerJoin(domains, eq(sessionDomains.domainId, domains.id))
    .innerJoin(identities, eq(sessionDomains.identityId, identities.id))
    .where(
      and(
        inArray(
          sessionDomains.sessionId,
          holders.map((h) => h.id)
        ),
        isNull(identities.endedAt)
      )
    );

  const namesBySession = new Map<string, string[]>();
  for (const r of rows) {
    const list = namesBySession.get(r.sessionId) ?? [];
    list.push(r.name);
    namesBySession.set(r.sessionId, list);
  }

  return holders.map((h) => ({
    id: h.id,
    createdAt: h.createdAt.toISOString(),
    lastSeenAt: h.lastSeenAt ? h.lastSeenAt.toISOString() : null,
    userAgent: h.userAgent,
    domains: (namesBySession.get(h.id) ?? []).sort(),
    current: h.id === currentSessionId,
  }));
}

/** Revoke another browser's session. Allowed because it holds the caller's domain. */
export async function revokeSession(sessionId: string, domainId: string): Promise<boolean> {
  const [binding] = await db
    .select({ sessionId: sessionDomains.sessionId })
    .from(sessionDomains)
    .innerJoin(identities, eq(sessionDomains.identityId, identities.id))
    .where(
      and(
        eq(sessionDomains.sessionId, sessionId),
        eq(sessionDomains.domainId, domainId),
        isNull(identities.endedAt)
      )
    )
    .limit(1);
  if (!binding) return false;
  await db.delete(sessions).where(eq(sessions.id, sessionId)); // cascades bindings + transfers
  return true;
}

/** Create a one-time code that clones this session into another browser. */
export async function createTransferCode(): Promise<{ code: string; expiresAt: Date } | null> {
  const session = await sessionByCookie();
  if (!session) return null;
  const code = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TRANSFER_TTL_MS);
  await db.insert(sessionTransfers).values({
    id: crypto.randomUUID(),
    sessionId: session.id,
    codeHash: sha256(code),
    expiresAt,
  });
  return { code, expiresAt };
}

/**
 * Copy the live domain bindings of a source session into a NEW session for
 * this browser and set its cookie — each browser stays an independently
 * revocable device. Shared by QR transfer and QR login.
 */
async function cloneSession(
  sourceSessionId: string,
  userAgent?: string | null
): Promise<{ domains: string[] } | null> {
  const bindings = await db
    .select({
      domainId: sessionDomains.domainId,
      identityId: sessionDomains.identityId,
      addedAt: sessionDomains.addedAt,
      name: domains.name,
      activeDomainId: sessions.activeDomainId,
    })
    .from(sessionDomains)
    .innerJoin(sessions, eq(sessionDomains.sessionId, sessions.id))
    .innerJoin(domains, eq(sessionDomains.domainId, domains.id))
    .innerJoin(identities, eq(sessionDomains.identityId, identities.id))
    .where(and(eq(sessionDomains.sessionId, sourceSessionId), isNull(identities.endedAt)))
    .orderBy(desc(sessionDomains.addedAt));
  if (bindings.length === 0) return null;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const id = crypto.randomUUID();
  const activeDomainId =
    bindings.find((b) => b.domainId === b.activeDomainId)?.domainId ?? bindings[0].domainId;
  await db.insert(sessions).values({
    id,
    tokenHash: sha256(token),
    activeDomainId,
    userAgent: userAgent ?? null,
    expiresAt,
  });
  await db.insert(sessionDomains).values(
    bindings.map((b) => ({ sessionId: id, domainId: b.domainId, identityId: b.identityId, addedAt: b.addedAt }))
  );
  await setCookie(token, expiresAt);
  return { domains: bindings.map((b) => b.name) };
}

/**
 * Redeem a transfer code: the domain bindings of the source session are
 * copied into a NEW session for this browser — each browser stays an
 * independently revocable device.
 */
export async function redeemTransferCode(
  rawCode: string,
  userAgent?: string | null
): Promise<{ domains: string[] } | null> {
  const code = rawCode.trim();
  if (!code) return null;

  const [row] = await db
    .select()
    .from(sessionTransfers)
    .where(
      and(
        eq(sessionTransfers.codeHash, sha256(code)),
        isNull(sessionTransfers.usedAt),
        gt(sessionTransfers.expiresAt, new Date())
      )
    )
    .limit(1);
  if (!row) return null;

  // Claim single use first so concurrent redeems can't both win.
  const claimed = await db
    .update(sessionTransfers)
    .set({ usedAt: new Date() })
    .where(and(eq(sessionTransfers.id, row.id), isNull(sessionTransfers.usedAt)))
    .returning({ id: sessionTransfers.id });
  if (claimed.length === 0) return null;

  return cloneSession(row.sessionId, userAgent);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  }
  store.delete(COOKIE_NAME);
}

/** An access change strips the domain from every session that held it. */
export async function purgeDomainFromSessions(domainId: string): Promise<void> {
  await db.delete(sessionDomains).where(eq(sessionDomains.domainId, domainId));
  await db.run(sql`DELETE FROM sessions WHERE id NOT IN (SELECT session_id FROM session_domains)`);
}

/**
 * QR login, step 1 (new browser): create a sign-in request. The code is the
 * poll credential — 32 random bytes, hashed at rest, no session needed yet.
 */
export async function createQrLogin(
  userAgent?: string | null
): Promise<{ code: string; expiresAt: Date }> {
  // housekeeping: these rows are worthless once expired
  await db.delete(qrLogins).where(lt(qrLogins.createdAt, new Date(Date.now() - QR_LOGIN_CLEANUP_MS)));

  const code = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + QR_LOGIN_TTL_MS);
  await db.insert(qrLogins).values({
    id: crypto.randomUUID(),
    codeHash: sha256(code),
    status: "pending",
    userAgent: userAgent ?? null,
    expiresAt,
  });
  return { code, expiresAt };
}

/** Info about a pending QR login, for the approving device to review. */
export async function peekQrLogin(
  rawCode: string
): Promise<{ device: string; createdAt: Date; expiresAt: Date } | null> {
  const code = rawCode.trim();
  if (!code) return null;
  const [row] = await db
    .select()
    .from(qrLogins)
    .where(and(eq(qrLogins.codeHash, sha256(code)), eq(qrLogins.status, "pending"), gt(qrLogins.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  return { device: deviceName(row.userAgent), createdAt: row.createdAt, expiresAt: row.expiresAt };
}

/**
 * QR login, step 2 (signed-in device): approve a pending request. The
 * approver's session becomes the clone source.
 */
export async function approveQrLogin(
  rawCode: string
): Promise<{ ok: true } | { ok: false; error: "no_session" | "invalid_code" }> {
  const code = rawCode.trim();
  if (!code) return { ok: false, error: "invalid_code" };
  const session = await sessionByCookie();
  if (!session) return { ok: false, error: "no_session" };

  const claimed = await db
    .update(qrLogins)
    .set({ status: "approved", sessionId: session.id })
    .where(
      and(
        eq(qrLogins.codeHash, sha256(code)),
        eq(qrLogins.status, "pending"),
        gt(qrLogins.expiresAt, new Date())
      )
    )
    .returning({ id: qrLogins.id });
  if (claimed.length === 0) return { ok: false, error: "invalid_code" };
  return { ok: true };
}

export type QrLoginPoll =
  | { status: "pending" }
  | { status: "ok"; domains: string[] }
  | { status: "used" }
  | { status: "expired" };

/**
 * QR login, step 3 (new browser): poll the request. Once approved, the poll
 * claims it single-use and receives a clone of the approving session —
 * cookie included.
 */
export async function pollQrLogin(rawCode: string, userAgent?: string | null): Promise<QrLoginPoll> {
  const code = rawCode.trim();
  if (!code) return { status: "expired" };

  const [row] = await db
    .select()
    .from(qrLogins)
    .where(eq(qrLogins.codeHash, sha256(code)))
    .limit(1);
  if (!row) return { status: "expired" };
  if (row.expiresAt.getTime() < Date.now()) return { status: "expired" };
  if (row.status === "done") return { status: "used" };
  if (row.status === "pending") return { status: "pending" };

  // approved → claim single use, then clone the approver's session
  const claimed = await db
    .update(qrLogins)
    .set({ status: "done" })
    .where(and(eq(qrLogins.id, row.id), eq(qrLogins.status, "approved")))
    .returning({ sessionId: qrLogins.sessionId });
  if (claimed.length === 0 || !claimed[0].sessionId) return { status: "used" };

  const cloned = await cloneSession(claimed[0].sessionId, userAgent);
  if (!cloned) return { status: "expired" }; // approver's session died in between
  return { status: "ok", domains: cloned.domains };
}
