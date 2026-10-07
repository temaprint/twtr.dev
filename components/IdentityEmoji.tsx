"use client";

import { useEffect } from "react";

/**
 * The first emoji of the domain's current fingerprint, shown next to the
 * domain name. Clicking opens the Identity history section and scrolls to it.
 */
export function IdentityEmoji({ fingerprint }: { fingerprint: string }) {
  const first = fingerprint.split(/\s+/)[0] ?? "";

  function go() {
    const el = document.getElementById("identity-history");
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <button
      onClick={go}
      title="Identity history"
      aria-label="Open identity history"
      className="cursor-pointer align-middle transition-opacity hover:opacity-60"
    >
      {first}
    </button>
  );
}

/** Opens the Identity history when the page is opened with #identity-history
 *  (links from post cards and other pages). */
export function OpenIdentityHistoryOnHash() {
  useEffect(() => {
    if (window.location.hash === "#identity-history") {
      const el = document.getElementById("identity-history");
      if (el instanceof HTMLDetailsElement) el.open = true;
    }
  }, []);
  return null;
}
