"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX = 280;

export function MessageComposer({ peer }: { peer: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const length = [...text].length;
  const canSubmit = length > 0 && length <= MAX && !busy;

  async function send() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(peer)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setText("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-end gap-2 px-4 py-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
        }}
        placeholder={`Message ${peer}`}
        rows={1}
        className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-2xl bg-card px-3.5 py-2 outline-none placeholder:text-muted"
      />
      <button
        onClick={send}
        disabled={!canSubmit}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );
}
