/** Parse @domain.tld mentions out of post/message text. */
export function parseMentions(text: string): string[] {
  const re = /@([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+)/gi;
  const found = new Set<string>();
  for (const m of text.matchAll(re)) {
    found.add(m[1].toLowerCase());
  }
  return [...found];
}
