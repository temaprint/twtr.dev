import { createHash } from "crypto";
import { EMOJI } from "./emoji-dict";

const FINGERPRINT_LENGTH = 5;

/**
 * Deterministic identity fingerprint: 5 distinct emoji derived from
 * SHA-256(domain + "|" + identityId). The server can always recompute it,
 * so a combination cannot be claimed by an impostor.
 */
export function fingerprintFor(domainName: string, identityId: string): string {
  const hash = createHash("sha256").update(`${domainName}|${identityId}`).digest();
  const picked: string[] = [];
  let i = 0;
  while (picked.length < FINGERPRINT_LENGTH && i < hash.length * 4) {
    const idx = hash[i % hash.length] % EMOJI.length;
    const emoji = EMOJI[idx];
    if (!picked.includes(emoji)) picked.push(emoji);
    i++;
  }
  return picked.join(" ");
}
