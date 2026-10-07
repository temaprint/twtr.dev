import { domainToASCII } from "url";

/**
 * Normalize user-supplied domain input: lowercase, strip scheme/path/userinfo/
 * port, punycode IDN. Accepts every registrable zone (gTLD, ccTLD, IDN,
 * punycode, emoji domains) — DNS control is the only gate, we do not
 * maintain a TLD whitelist. Returns null if the result is not a plausible
 * multi-label hostname.
 */
export function normalizeDomain(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s || s.length > 300) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // strip scheme
  s = s.split(/[/?#]/)[0];
  if (s.includes("@")) s = s.split("@").pop()!;
  s = s.replace(/:\d{1,5}$/, ""); // strip :port
  if (!s) return null;

  // full stops: ASCII '.', ideographic '。', fullwidth '．', halfwidth '｡'
  s = s.replace(/[.。\uFF0E\uFF61]+$/, "");

  const ascii = domainToASCII(s);
  if (!ascii) return null;
  const name = ascii.toLowerCase().replace(/[.]+$/, "");
  if (!name) return null;

  if (name.length > 253) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return null; // IPv4
  // at least two labels, each valid (also rejects single-label hosts like localhost)
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(name)) return null;
  return name;
}
