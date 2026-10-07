import { createHmac } from "crypto";

/**
 * Server signature: proof that this exact content was published through
 * twtr by the given identity. HMAC-SHA256 under the server secret.
 */
export function serverSignature(
  kind: "post" | "message",
  id: string,
  authorDomain: string,
  authorIdentityId: string,
  createdAt: Date,
  text: string
): string {
  return createHmac("sha256", process.env.TWTR_SECRET ?? "dev-secret")
    .update(`${kind}|${id}|${authorDomain}|${authorIdentityId}|${createdAt.toISOString()}|${text}`)
    .digest("hex");
}
