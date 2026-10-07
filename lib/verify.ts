import { createHash, randomBytes } from "crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "./db";
import { domains, identities, challenges } from "./schema";
import { resolveTwtrToken, mockSetTxt } from "./dns";
import { fingerprintFor } from "./fingerprint";
import { normalizeDomain } from "./domain";
import { sessionFor, purgeDomainFromSessions } from "./session";

const CHALLENGE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function newToken(): string {
  return randomBytes(20).toString("hex"); // 40 hex chars
}

export interface ChallengeResult {
  domain: string;
  known: boolean; // domain already had an identity before (login vs first connect)
  record: { type: "TXT"; name: string; value: string };
}

/** Step 1: register/look up the domain and issue a fresh DNS challenge. */
export async function startChallenge(rawDomain: string): Promise<ChallengeResult | { error: string }> {
  const name = normalizeDomain(rawDomain);
  if (!name) return { error: "invalid_domain" };

  let domain = (await db.select().from(domains).where(eq(domains.name, name)).limit(1))[0];
  const known = !!domain;

  if (!domain) {
    domain = { id: crypto.randomUUID(), name, bio: null, createdAt: new Date() };
    await db.insert(domains).values(domain);
  }

  const token = newToken();
  await db.insert(challenges).values({
    id: crypto.randomUUID(),
    domainId: domain.id,
    token,
    tokenHash: sha256(token),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });

  // In mock-DNS dev mode, pretend the record was published immediately.
  if (process.env.TWTR_MOCK_DNS === "1" && name.endsWith(".test")) {
    mockSetTxt(name, `twtr=${token}`);
  }

  return {
    domain: name,
    known,
    record: { type: "TXT", name: "_twtr", value: `twtr=${token}` },
  };
}

export interface VerifyOk {
  ok: true;
  domain: string;
  fingerprint: string;
  identityChanged: boolean;
  /** true when the domain was added to a session that already had other domains */
  addedToSession: boolean;
}

/**
 * Step 2: check DNS for a token matching an unexpired challenge.
 *
 * SECURITY: the TXT value is public — anyone can `dig` it — so reading the
 * current record must NEVER authenticate. Only a token that matches a fresh,
 * unexpired challenge proves the caller just *wrote* the zone. A token
 * change is recorded honestly as a new identity period ("Domain access
 * changed"), per the spec: the system records the provable fact, never
 * speculates about why.
 */
export async function verifyDomain(
  rawDomain: string,
  userAgent?: string | null
): Promise<VerifyOk | { ok: false; error: string }> {
  const name = normalizeDomain(rawDomain);
  if (!name) return { ok: false, error: "invalid_domain" };

  const domain = (await db.select().from(domains).where(eq(domains.name, name)).limit(1))[0];
  if (!domain) return { ok: false, error: "unknown_domain" };

  const dnsToken = await resolveTwtrToken(name);
  if (!dnsToken) return { ok: false, error: "record_not_found" };
  const dnsTokenHash = sha256(dnsToken);

  const currentIdentity = (
    await db
      .select()
      .from(identities)
      .where(and(eq(identities.domainId, domain.id), isNull(identities.endedAt)))
      .limit(1)
  )[0];

  const challenge = (
    await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.domainId, domain.id),
          eq(challenges.tokenHash, dnsTokenHash),
          gt(challenges.expiresAt, new Date())
        )
      )
      .orderBy(desc(challenges.createdAt))
      .limit(1)
  )[0];
  if (!challenge) {
    // DNS still carries the previous identity's token — reading it proves
    // nothing. Tell the user to publish the fresh record we just issued.
    if (currentIdentity && currentIdentity.tokenHash === dnsTokenHash) {
      return { ok: false, error: "stale_record" };
    }
    return { ok: false, error: "no_matching_challenge" };
  }

  // Token changed → close the current identity, record an access-change event,
  // and strip this domain from every session that held it (a new owner must
  // not inherit access — neither here nor via the rest of a browser session).
  if (currentIdentity) {
    await db.update(identities).set({ endedAt: new Date() }).where(eq(identities.id, currentIdentity.id));
    await purgeDomainFromSessions(domain.id);
  }

  const identityId = crypto.randomUUID();
  const fingerprint = fingerprintFor(name, identityId);
  await db.insert(identities).values({
    id: identityId,
    domainId: domain.id,
    token: challenge.token,
    tokenHash: challenge.tokenHash,
    fingerprint,
    changeType: currentIdentity ? "access_changed" : "initial",
    startedAt: new Date(),
    endedAt: null,
  });
  await db.delete(challenges).where(eq(challenges.id, challenge.id));

  const { multi } = await sessionFor(domain.id, identityId, userAgent);
  return { ok: true, domain: name, fingerprint, identityChanged: true, addedToSession: multi };
}
