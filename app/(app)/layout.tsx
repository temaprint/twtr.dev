import Link from "next/link";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { DomainSwitcher } from "@/components/DomainSwitcher";

function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <Link href="/" className="font-mono text-lg font-bold">
        twtr.dev
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/docs" className="px-2 py-1.5 text-sm font-medium hover:underline">
          Docs
        </Link>
        <Link
          href="/connect?mode=login"
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-card"
        >
          Log in
        </Link>
        <Link
          href="/connect"
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Join
        </Link>
      </div>
    </header>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Visitors browse the public timeline and profiles with a minimal header;
  // actions that need an identity still redirect to /connect themselves.
  if (!session) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl">
        <PublicHeader />
        <main className="min-w-0">{children}</main>
      </div>
    );
  }

  const [{ unread }] = await db
    .select({ unread: sql<number>`count(*)` })
    .from(messages)
    .where(and(eq(messages.toDomainId, session.domain.id), isNull(messages.readAt)));

  const items = [
    { href: "/home", label: "Home", badge: 0 },
    { href: "/messages", label: "Messages", badge: Number(unread) },
    { href: `/${session.domain.name}`, label: "Profile", badge: 0 },
    { href: "/settings", label: "Settings", badge: 0 },
    { href: "/docs", label: "Docs", badge: 0 },
  ];

  const currentDomain = {
    name: session.domain.name,
    fingerprint: session.identity.fingerprint,
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl md:max-w-5xl">
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col gap-1 border-r border-border p-4 md:flex">
        <Link href="/home" className="mb-4 px-2 font-mono text-lg font-bold">
          twtr.dev
        </Link>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-card"
          >
            <span>{item.label}</span>
            {item.badge > 0 ? (
              <span className="rounded-full bg-accent px-1.5 text-xs leading-5 text-accent-fg">{item.badge}</span>
            ) : null}
          </Link>
        ))}
        <div className="mt-auto">
          <DomainSwitcher current={currentDomain} domains={session.domains} direction="up" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 border-border pb-16 md:border-r md:pb-0">
        {session.domains.length > 1 ? (
          <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-2 md:hidden">
            <DomainSwitcher current={currentDomain} domains={session.domains} direction="down" />
          </div>
        ) : null}
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-border bg-background md:hidden">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex-1 py-3 text-center text-sm hover:bg-card"
          >
            {item.label}
            {item.badge > 0 ? (
              <span className="absolute right-1/4 top-1 rounded-full bg-accent px-1.5 text-[10px] leading-4 text-accent-fg">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
