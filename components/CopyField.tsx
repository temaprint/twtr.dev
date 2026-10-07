"use client";

import { useState } from "react";

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (e.g. insecure context) — user can select manually
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded border border-border bg-card px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
        <div className="truncate font-mono text-sm">{value}</div>
      </div>
      <button onClick={copy} className="shrink-0 rounded border border-border px-2 py-1 text-xs hover:bg-background">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
