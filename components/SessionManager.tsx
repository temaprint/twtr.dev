"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { CopyField } from "./CopyField";

interface DomainOption {
  name: string;
  fingerprint: string;
}

interface SessionItem {
  id: string;
  createdAt: string;
  lastSeenAt: string | null;
  device: string;
  domains: string[];
  current: boolean;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function SessionManager({
  currentDomain,
  domains,
}: {
  currentDomain: string;
  domains: DomainOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [transfer, setTransfer] = useState<{ url: string; code: string; expiresAt: string } | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) setSessions((await res.json()).sessions);
    } catch {
      // keep whatever we had
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sessions")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSessions(data.sessions);
      })
      .catch(() => {
        // keep whatever we had
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function switchTo(name: string) {
    if (name === currentDomain) return;
    setBusy(name);
    try {
      const res = await fetch("/api/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: name }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(name: string) {
    setBusy(name);
    try {
      const res = await fetch(`/api/session/domains/${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.remaining === 0) {
        router.push("/");
        return;
      }
      if (res.ok) {
        router.refresh();
        void loadSessions();
      }
    } finally {
      setBusy(null);
    }
  }

  async function revoke(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) void loadSessions();
    } finally {
      setBusy(null);
    }
  }

  async function makeTransferCode() {
    setTransferError(null);
    try {
      const res = await fetch("/api/session/transfer", { method: "POST" });
      if (!res.ok) {
        setTransferError("Could not create a transfer code. Try again.");
        return;
      }
      const data = await res.json();
      const url = `${window.location.origin}/transfer?c=${encodeURIComponent(data.code)}`;
      setTransfer({ url, code: data.code, expiresAt: data.expiresAt });
    } catch {
      setTransferError("Network error.");
    }
  }

  return (
    <>
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Domains in this browser</h2>
        <p className="mt-1 text-sm text-muted">
          One session can hold several domains — verify them from{" "}
          <Link href="/connect" className="text-accent hover:underline">
            /connect
          </Link>{" "}
          and switch anytime.
        </p>
        <div className="mt-3 divide-y divide-border rounded border border-border">
          {domains.map((d) => (
            <div key={d.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-sm font-bold">
                  {d.name}
                  {d.name === currentDomain ? <span className="text-accent"> ✓ active</span> : null}
                </span>
                <span className="block text-xs tracking-wide text-muted">{d.fingerprint}</span>
              </span>
              {d.name !== currentDomain ? (
                <>
                  <button
                    onClick={() => switchTo(d.name)}
                    disabled={busy !== null}
                    className="rounded border border-border px-2.5 py-1 text-xs hover:bg-card disabled:opacity-50"
                  >
                    Switch
                  </button>
                  <button
                    onClick={() => disconnect(d.name)}
                    disabled={busy !== null}
                    className="rounded border border-border px-2.5 py-1 text-xs text-muted hover:bg-card disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </>
              ) : domains.length > 1 ? (
                <button
                  onClick={() => disconnect(d.name)}
                  disabled={busy !== null}
                  className="rounded border border-border px-2.5 py-1 text-xs text-muted hover:bg-card disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Transfer to another device</h2>
        <p className="mt-1 text-sm text-muted">
          Scan the QR code on the other browser — it gets the same domains in a new session there.
        </p>
        {transfer ? (
          <div className="mt-3 flex flex-col items-start gap-3 rounded border border-border p-4 sm:flex-row sm:items-center">
            <div className="rounded bg-white p-2">
              <QRCode value={transfer.url} size={160} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <CopyField label="Or open this link" value={transfer.url} />
              <p className="text-xs text-muted">Single use · valid for 5 minutes.</p>
            </div>
          </div>
        ) : (
          <button
            onClick={makeTransferCode}
            className="mt-3 rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-card"
          >
            Show QR code
          </button>
        )}
        {transferError ? <p className="mt-2 text-sm text-red-500">{transferError}</p> : null}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Active sessions</h2>
        <p className="mt-1 text-sm text-muted">
          Browsers where {currentDomain} is verified. Revoking signs that browser out of all its domains.
        </p>
        {sessions === null ? (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded border border-border">
            {sessions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {s.device}
                    {s.current ? <span className="text-accent"> · this device</span> : null}
                  </span>
                  <span className="block text-xs text-muted">
                    Last seen {timeAgo(s.lastSeenAt)} · added {timeAgo(s.createdAt)} ·{" "}
                    <span className="font-mono">{s.domains.join(", ")}</span>
                  </span>
                </span>
                {!s.current ? (
                  <button
                    onClick={() => revoke(s.id)}
                    disabled={busy !== null}
                    className="rounded border border-border px-2.5 py-1 text-xs text-red-500 hover:bg-card disabled:opacity-50"
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
