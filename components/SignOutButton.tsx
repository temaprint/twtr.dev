"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-card"
    >
      Sign out
    </button>
  );
}
