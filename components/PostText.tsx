import Link from "next/link";
import type { ReactNode } from "react";

const MENTION_RE = /@([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+)/gi;

/** Post body with @domain.tld mentions rendered as profile links. */
export function PostText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) nodes.push(text.slice(last, idx));
    const domain = m[1];
    nodes.push(
      <Link key={key++} href={`/${domain}`} className="text-accent hover:underline">
        @{domain}
      </Link>
    );
    last = idx + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <p className="whitespace-pre-wrap break-words">{nodes}</p>;
}
