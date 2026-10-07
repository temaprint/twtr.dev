"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DomainOption {
  name: string;
  fingerprint: string;
}

/**
 * Switch between the domains verified in this browser. `direction` decides
 * where the dropdown opens ("up" in the sidebar, "down" in the mobile bar).
 */
export function DomainSwitcher({
  current,
  domains,
  direction,
}: {
  current: DomainOption;
  domains: DomainOption[];
  direction: "up" | "down";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function pick(name: string) {
    if (name === current.name) {
      setOpen(false);
      return;
    }
    setBusy(name);
    try {
      const res = await fetch("/api/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: name }),
      });
      setOpen(false);
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-card"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-sm font-bold">{current.name}</span>
          <span className="block text-xs tracking-wide">{current.fingerprint}</span>
        </span>
        {domains.length > 1 ? <span className="text-muted">{open ? "▴" : "▾"}</span> : null}
      </button>

      {open && domains.length > 1 ? (
        <div
          className={`absolute left-0 right-0 z-20 overflow-hidden rounded border border-border bg-card shadow-lg ${
            direction === "up" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {domains.map((d) => (
            <button
              key={d.name}
              onClick={() => pick(d.name)}
              disabled={busy !== null}
              className={`flex w-full flex-col px-3 py-2 text-left hover:bg-background disabled:opacity-50 ${
                d.name === current.name ? "bg-background" : ""
              }`}
            >
              <span className="truncate font-mono text-sm">
                {d.name}
                {d.name === current.name ? <span className="text-accent"> ✓</span> : null}
              </span>
              <span className="text-xs tracking-wide text-muted">{d.fingerprint}</span>
            </button>
          ))}
        </div>
      ) : null}

      <Link
        href="/connect"
        className="mt-1 block rounded px-2 py-1 text-sm text-accent hover:bg-card hover:underline"
      >
        + Add domain
      </Link>
    </div>
  );
}
