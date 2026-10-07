import { Resolver } from "dns/promises";

const TOKEN_RE = /twtr=([a-f0-9]{16,64})/i;

// Dev-only mock: TWTR_MOCK_DNS=1 resolves _twtr TXT for *.test domains
// from this in-memory map, so the full flow is testable without real DNS.
const mockRecords = new Map<string, string>();

export function mockSetTxt(domain: string, value: string) {
  mockRecords.set(domain, value);
}

export function mockGetTxt(domain: string): string | undefined {
  return mockRecords.get(domain);
}

/**
 * Resolve the _twtr TXT record for a domain and extract the verification
 * token (`twtr=<hex>`). Returns null on any failure — never throws.
 */
export async function resolveTwtrToken(domain: string): Promise<string | null> {
  if (process.env.TWTR_MOCK_DNS === "1" && domain.endsWith(".test")) {
    const value = mockRecords.get(domain);
    return value ? extractToken([value]) : null;
  }

  const resolver = new Resolver({ timeout: 4000, tries: 2 });
  try {
    const chunks = await resolver.resolveTxt(`_twtr.${domain}`);
    return extractToken(chunks.map((c) => c.join("")));
  } catch {
    return null;
  }
}

function extractToken(values: string[]): string | null {
  for (const v of values) {
    const m = v.match(TOKEN_RE);
    if (m) return m[1].toLowerCase();
  }
  return null;
}
