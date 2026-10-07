"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FollowButton({
  domain,
  initial,
  small = false,
}: {
  domain: string;
  initial: boolean;
  small?: boolean;
}) {
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/domains/${encodeURIComponent(domain)}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      if (res.ok) {
        setFollowing(!following);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const size = small ? "px-2.5 py-0.5 text-xs" : "px-4 py-1.5 text-sm";

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={
        following
          ? `rounded-full border border-border font-medium hover:opacity-70 ${size}`
          : `rounded-full bg-accent font-medium text-accent-fg hover:opacity-90 ${size}`
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
