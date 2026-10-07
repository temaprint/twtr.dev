"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX_BIO = 200;

export function BioForm({ initial }: { initial: string | null }) {
  const [bio, setBio] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function save() {
    if (busy) return;
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <textarea
        value={bio}
        onChange={(e) => {
          setBio(e.target.value);
          setSaved(false);
        }}
        placeholder="One line about this domain"
        rows={2}
        maxLength={MAX_BIO}
        className="w-full resize-none rounded border border-border bg-card px-3 py-2 outline-none focus:border-accent"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-40"
        >
          Save
        </button>
        <span className="text-sm text-muted">
          {saved ? "Saved" : `${[...bio].length}/${MAX_BIO}`}
        </span>
      </div>
    </div>
  );
}
