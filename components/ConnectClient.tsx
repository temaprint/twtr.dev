"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { CopyField } from "./CopyField";

interface ChallengeResponse {
  domain: string;
  known: boolean;
  record: { type: "TXT"; name: string; value: string };
}

// Display-only seed for the QR countdown; the poll decides real expiry.
const QR_TTL_SECONDS = 300;

export function ConnectClient({ loginMode }: { loginMode: boolean }) {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [fingerprint, setFingerprint] = useState("");
  const [addedToSession, setAddedToSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);

  // QR sign-in (login mode): new browser shows a QR, a signed-in device approves
  const [qr, setQr] = useState<{ code: string; url: string; expiresAt: number } | null>(null);
  const [qrState, setQrState] = useState<"waiting" | "ok" | "expired" | "used">("waiting");
  const [qrDomains, setQrDomains] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(0);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopQrTimers = useCallback(() => {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
    if (qrTickRef.current) {
      clearInterval(qrTickRef.current);
      qrTickRef.current = null;
    }
  }, []);

  useEffect(() => stopQrTimers, [stopQrTimers]);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const check = useCallback(
    async (name: string) => {
      attemptRef.current += 1;
      setStatus("checking");
      try {
        const res = await fetch("/api/domains/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: name }),
        });
        const data = await res.json();
        if (res.status === 200 && data.ok) {
          stopPolling();
          setFingerprint(data.fingerprint);
          setAddedToSession(!!data.addedToSession);
          setStatus("success");
          router.refresh();
          return;
        }
        if (res.status === 429) {
          stopPolling();
          setStatus("error");
          setError("Too many attempts. Wait a minute and try again.");
          return;
        }
        if (data.error === "no_matching_challenge" && attemptRef.current > 120) {
          stopPolling();
          setStatus("error");
          setError("Challenge expired. Start over to get a new record.");
          return;
        }
        if (data.error === "stale_record") {
          if (attemptRef.current > 120) {
            stopPolling();
            setStatus("error");
            setError("Challenge expired. Start over to get a new record.");
            return;
          }
          setError(
            "Your DNS still shows the previous record — replace it with the fresh value above. We keep checking."
          );
          setStatus("idle");
          return;
        }
        // DNS not propagated yet — keep waiting quietly
        setStatus("idle");
      } catch {
        setStatus("idle");
      }
    },
    [router, stopPolling]
  );

  function start() {
    setError(null);
    attemptRef.current = 0;
    fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error === "invalid_domain" ? "That doesn't look like a domain." : "Something went wrong.");
          return;
        }
        setChallenge(data);
        stopPolling();
        timerRef.current = setInterval(() => check(data.domain), 8000);
        void check(data.domain);
      })
      .catch(() => setError("Network error."));
  }

  function reset() {
    stopPolling();
    setChallenge(null);
    setStatus("idle");
    setFingerprint("");
    setAddedToSession(false);
    setError(null);
    attemptRef.current = 0;
  }

  async function startQrLogin() {
    setError(null);
    stopPolling();
    setQrDomains([]);
    setQrState("waiting");
    try {
      const res = await fetch("/api/qr-login", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "rate_limited" ? "Too many attempts. Wait a minute." : "Could not create a QR code."
        );
        return;
      }
      const expiresAt = new Date(data.expiresAt).getTime();
      const url = `${window.location.origin}/transfer/approve?r=${encodeURIComponent(data.code)}`;
      setQr({ code: data.code, url, expiresAt });
      stopQrTimers();
      setCountdown(QR_TTL_SECONDS);
      qrTickRef.current = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
      qrPollRef.current = setInterval(() => void pollQr(data.code), 2500);
      void pollQr(data.code);
    } catch {
      setError("Network error.");
    }
  }

  async function pollQr(code: string) {
    try {
      const res = await fetch(`/api/qr-login?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.status === "ok") {
        stopQrTimers();
        setQrDomains(data.domains ?? []);
        setQrState("ok");
        router.refresh();
      } else if (data.status === "expired" || data.status === "used") {
        stopQrTimers();
        setQrState(data.status);
      }
    } catch {
      // network hiccup — keep waiting
    }
  }

  function cancelQr() {
    stopQrTimers();
    setQr(null);
    setQrState("waiting");
    setCountdown(0);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-16">
      <Link href="/" className="font-mono text-sm text-muted hover:underline">
        twtr.dev
      </Link>

      <h1 className="mt-8 text-3xl font-bold">{loginMode ? "Welcome back" : "Connect your domain"}</h1>

      {!challenge && status !== "success" && !qr ? (
        <>
          <p className="mt-3 text-muted">
            {loginMode
              ? "Sign in by proving control of your domain — update the DNS record to the fresh value we give you."
              : "No usernames. No passwords. Your DNS proves who you are — and it is also your recovery."}
          </p>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && domain.trim() && start()}
            placeholder="example.com"
            autoFocus
            className="mt-8 w-full rounded border border-border bg-card px-4 py-3 font-mono outline-none focus:border-accent"
          />
          {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
          <button
            onClick={start}
            disabled={!domain.trim()}
            className="mt-4 self-end rounded-full bg-accent px-6 py-2 font-medium text-accent-fg disabled:opacity-40"
          >
            {loginMode ? "Sign in" : "Continue"}
          </button>
          {loginMode ? (
            <>
              <div className="mt-10 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <button
                onClick={startQrLogin}
                className="mt-4 self-end rounded-full border border-border px-6 py-2 font-medium hover:bg-card"
              >
                Log in with a QR code
              </button>
              <p className="mt-2 self-end text-xs text-muted">
                Scan it with a browser where you are already signed in.
              </p>
            </>
          ) : null}
        </>
      ) : null}

      {qr && qrState === "waiting" ? (
        <>
          <p className="mt-3 text-muted">Scan this with a browser where you are already signed in:</p>
          <div className="mt-6 self-center rounded bg-white p-3">
            <QRCode value={qr.url} size={180} />
          </div>
          <p className="mt-4 text-center text-sm text-muted">
            Waiting for approval…{" "}
            <span className="font-mono">
              {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
            </span>
          </p>
          <button onClick={cancelQr} className="mt-6 self-center text-sm text-muted hover:underline">
            Use domain instead
          </button>
        </>
      ) : null}

      {qr && (qrState === "expired" || qrState === "used") ? (
        <div className="mt-10 text-center">
          <p className="text-lg">
            {qrState === "used" ? "This code was already used in another tab." : "The code expired."}
          </p>
          <p className="mt-2 text-sm text-muted">
            QR sign-in codes are single-use and live for 5 minutes.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={startQrLogin}
              className="rounded-full bg-accent px-6 py-2 font-medium text-accent-fg"
            >
              New code
            </button>
            <button onClick={cancelQr} className="text-sm text-muted hover:underline">
              Use domain instead
            </button>
          </div>
        </div>
      ) : null}

      {qr && qrState === "ok" ? (
        <div className="mt-10 text-center">
          <p className="text-accent">✓ Signed in</p>
          <p className="mt-3 font-mono text-lg font-bold">{qrDomains.join(" · ")}</p>
          <p className="mt-4 text-sm text-muted">
            This browser now holds the same domains as the device that approved you — as its own,
            separately revocable session.
          </p>
          <Link
            href="/home"
            className="mt-8 inline-block rounded-full bg-accent px-6 py-2.5 font-medium text-accent-fg hover:opacity-90"
          >
            Go to twtr
          </Link>
        </div>
      ) : null}

      {challenge && status !== "success" ? (
        <>
          <p className="mt-3 text-muted">
            {challenge.known
              ? `Welcome back, ${challenge.domain}. Add this DNS record to sign in:`
              : "Add this DNS record to prove you own the domain:"}
          </p>

          <div className="mt-6 space-y-3">
            <CopyField label="Type" value={challenge.record.type} />
            <CopyField label="Name" value={challenge.record.name} />
            <CopyField label="Value" value={challenge.record.value} />
          </div>

          <p className="mt-3 text-sm text-muted">
            Some DNS providers want the full record name:{" "}
            <span className="font-mono">_twtr.{challenge.domain}</span>. DNS can take a few minutes to
            propagate — we check automatically every 8 seconds.
          </p>

          {challenge.known ? (
            <p className="mt-3 text-sm text-muted">
              Heads-up: signing in always starts a new identity period (the old record is public — reading it
              proves nothing). To keep your current identity and fingerprint, press{" "}
              <em>Use another domain</em> and then <em>Log in with a QR code</em> — scan it with a browser
              where you are already signed in.
            </p>
          ) : null}

          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => check(challenge.domain)}
              disabled={status === "checking"}
              className="rounded-full bg-accent px-6 py-2 font-medium text-accent-fg disabled:opacity-50"
            >
              {status === "checking" ? "Checking DNS…" : "Check now"}
            </button>
            <button onClick={reset} className="text-sm text-muted hover:underline">
              Use another domain
            </button>
          </div>
        </>
      ) : null}

      {status === "success" ? (
        <div className="mt-10 text-center">
          <p className="text-accent">{addedToSession ? "✓ Domain added" : "✓ Domain verified"}</p>
          <p className="mt-3 font-mono text-2xl font-bold">{challenge?.domain}</p>
          <p className="mt-4 text-2xl tracking-wide">{fingerprint}</p>
          <p className="mt-4 text-sm text-muted">
            {addedToSession
              ? "It's now the active domain of this browser — switch between your domains from the sidebar or Settings."
              : "This is your identity fingerprint. It changes only when the DNS verification record changes — and old posts keep theirs forever."}
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
