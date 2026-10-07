import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BioForm } from "@/components/BioForm";
import { SignOutButton } from "@/components/SignOutButton";
import { CopyField } from "@/components/CopyField";
import { SessionManager } from "@/components/SessionManager";
import { fullDate } from "@/lib/time";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/connect");
  const { domain, identity } = session;

  return (
    <div className="px-4 py-6">
      <h1 className="font-mono text-lg font-bold">Settings</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Identity</h2>
        <div className="mt-3 rounded border border-border p-4">
          <div className="font-mono text-lg font-bold">
            {domain.name} <span className="text-accent">✓</span>
          </div>
          <div className="mt-2 text-xl tracking-wide">{identity.fingerprint}</div>
          <p className="mt-2 text-sm text-muted">
            Current identity since {fullDate(identity.startedAt)} ·{" "}
            {identity.changeType === "initial" ? "first verification" : "DNS record changed since"}
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">DNS record</h2>
        <div className="mt-3 space-y-3">
          <CopyField label="Type" value="TXT" />
          <CopyField label="Name" value="_twtr" />
          <CopyField label="Value" value={`twtr=${identity.token}`} />
        </div>
        <p className="mt-3 text-sm text-muted">
          Keep this record in place. Reading it never grants access — signing in always requires publishing a
          fresh value, which starts a new identity period (old posts keep their fingerprint). To move this
          session to another browser, use Transfer below instead of re-verifying.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Bio</h2>
        <div className="mt-3">
          <BioForm initial={domain.bio} />
        </div>
      </section>

      <SessionManager
        currentDomain={domain.name}
        domains={session.domains.map(({ name, fingerprint }) => ({ name, fingerprint }))}
      />

      <section className="mt-8 border-t border-border pt-6">
        <SignOutButton />
        <p className="mt-2 text-sm text-muted">
          Signing back in is the same as connecting: add the fresh DNS record and you are in. No passwords to
          forget.
        </p>
      </section>
    </div>
  );
}
