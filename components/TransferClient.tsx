"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * QR transfer landing: redeem the one-time code from the URL and receive
 * the session (all its domains) in this browser.
 */
export function TransferClient({ code }: { code: string | null }) {
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [domains, setDomains] = useState<string[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !code) return;
    started.current = true;
    fetch("/api/session/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setDomains(data.domains);
          setState("ok");
        } else {
          setState("error");
        }
      })
      .catch(() => setState("error"));
  }, [code]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-16">
      <Link href="/" className="font-mono text-sm text-muted hover:underline">
        twtr.dev
      </Link>

      {!code || state === "error" ? (
        <div className="mt-16 text-center">
          <p className="text-lg">This code is invalid or expired.</p>
          <p className="mt-2 text-sm text-muted">Transfer codes are single-use and live for 5 minutes.</p>
          <Link
            href="/connect"
            className="mt-8 inline-block rounded-full bg-accent px-6 py-2.5 font-medium text-accent-fg hover:opacity-90"
          >
            Sign in with your domain instead
          </Link>
        </div>
      ) : null}

      {code && state === "working" ? (
        <div className="mt-16 text-center">
          <p className="text-lg">Transferring session…</p>
          <p className="mt-2 text-sm text-muted">Redeeming the code from the QR link.</p>
        </div>
      ) : null}

      {code && state === "ok" ? (
        <div className="mt-16 text-center">
          <p className="text-accent">✓ Session transferred</p>
          <p className="mt-4 font-mono text-lg font-bold">{domains.join(" · ")}</p>
          <p className="mt-4 text-sm text-muted">
            This browser now holds the same domains as the device that showed the QR code. Each browser stays
            separately revocable from Settings.
          </p>
          <Link
            href="/home"
            className="mt-8 inline-block rounded-full bg-accent px-6 py-2.5 font-medium text-accent-fg hover:opacity-90"
          >
            Go to twtr
          </Link>
        </div>
      ) : null}
    </div>
  );
}
