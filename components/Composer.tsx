"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX = 280;

export function Composer({
  replyToId,
  placeholder = "Post as your domain",
  autoFocus = false,
}: {
  replyToId?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const length = [...text].length;
  const canSubmit = length > 0 && length <= MAX && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, replyToId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error === "too_long" ? "Too long" : data.error === "rate_limited" ? "Slow down" : "Failed to post");
        return;
      }
      setText("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-border px-4 py-3">
      <textarea
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        placeholder={placeholder}
        rows={replyToId ? 2 : 3}
        className="w-full resize-none bg-transparent text-foreground outline-none placeholder:text-muted"
      />
      <div className="mt-2 flex items-center justify-end gap-3">
        {error ? <span className="text-sm text-red-500">{error}</span> : null}
        <span className={`text-sm tabular-nums ${length > MAX ? "text-red-500" : length > MAX - 40 ? "text-muted" : "text-muted/60"}`}>
          {length}/{MAX}
        </span>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-40"
        >
          {replyToId ? "Reply" : "Post"}
        </button>
      </div>
    </div>
  );
}
