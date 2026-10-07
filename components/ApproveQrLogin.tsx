"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Landing page for a scanned QR sign-in: shows who is asking and approves
 * the request. The new browser receives a clone of *this* session.
 */
export function ApproveQrLogin({
  code,
  device,
  domains,
}: {
  code: string | null;
  device: string | null;
  domains: string[];
}) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (!code) return;
    setState("busy");
    setError(null);
    try {
      const res = await fetch("/api/qr-login/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setState("ok");
        return;
      }
      setError(
        data.error === "rate_limited"
          ? "Too many attempts. Wait a minute."
          : "This code is invalid, expired, or already used."
      );
      setState("error");
    } catch {
      setError("Network error.");
      setState("error");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-16">
      <Link href="/" className="font-mono text-sm text-muted hover:underline">
        twtr.dev
      </Link>

      {!code || state === "error" ? (
        <div className="mt-16 text-center">
          <p className="text-lg">{error ?? "Nothing to approve."}</p>
          <p className="mt-2 text-sm text-muted">
            QR sign-in codes are single-use and live for 5 minutes. Ask the other browser to show a new
            code.
          </p>
          <Link
            href="/home"
            className="mt-8 inline-block rounded-full border border-border px-6 py-2.5 font-medium hover:bg-card"
          >
            Back to twtr
          </Link>
        </div>
      ) : null}

      {code && (state === "idle" || state === "busy") ? (
        <>
          <h1 className="mt-8 text-3xl font-bold">Sign-in request</h1>
          <p className="mt-3 text-muted">
            {device ? (
              <>
                <span className="font-medium">{device}</span> is asking to sign in to twtr.
              </>
            ) : (
              <>A new browser is asking to sign in to twtr.</>
            )}
          </p>
          <div className="mt-6 rounded border border-border p-4">
            <p className="text-sm text-muted">Approving shares these domains with it:</p>
            <p className="mt-2 font-mono text-sm font-bold">{domains.join(" · ")}</p>
            <p className="mt-2 text-xs text-muted">
              The new browser gets its own separately revocable session — not this one.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={approve}
              disabled={state === "busy"}
              className="rounded-full bg-accent px-6 py-2 font-medium text-accent-fg disabled:opacity-50"
            >
              {state === "busy" ? "Approving…" : "Approve"}
            </button>
            <Link href="/home" className="text-sm text-muted hover:underline">
              Cancel
            </Link>
          </div>
        </>
      ) : null}

      {code && state === "ok" ? (
        <div className="mt-16 text-center">
          <p className="text-accent">✓ Approved</p>
          <p className="mt-4 text-sm text-muted">
            Check the other browser — it signs in automatically. You can revoke it anytime from
            Settings → Active sessions.
          </p>
          <Link
            href="/home"
            className="mt-8 inline-block rounded-full border border-border px-6 py-2.5 font-medium hover:bg-card"
          >
            Back to twtr
          </Link>
        </div>
      ) : null}
    </div>
  );
}
