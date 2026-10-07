import Link from "next/link";

const SECTIONS = [
  { id: "manifesto", label: "Manifesto" },
  { id: "getting-started", label: "Getting started" },
  { id: "identity", label: "Identity & fingerprints" },
  { id: "posting", label: "Posting" },
  { id: "feeds", label: "Following & feeds" },
  { id: "dm", label: "Direct messages" },
  { id: "sessions", label: "Multiple domains & sessions" },
  { id: "faq", label: "FAQ" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 border-b border-border px-4 py-6">
      <h2 className="font-mono text-lg font-bold">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <div>
      <div className="border-b border-border px-4 py-6">
        <h1 className="font-mono text-xl font-bold">Documentation</h1>
        <p className="mt-1 text-sm text-muted">
          New here? This page explains everything: how domain identity works, how to join, and how to reach
          the people behind the domains.
        </p>
        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {SECTIONS.map((s) => (
            <Link key={s.id} href={`/docs#${s.id}`} className="text-accent hover:underline">
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      <Section id="manifesto" title="Manifesto">
        <p>
          We believe the web already has identities.{" "}
          <span className="text-muted">We just never used them.</span>
        </p>
        <p>
          <strong>Freedom of communication, without hard verification.</strong> No email to confirm. No phone
          number to surrender. No ID checks, no gatekeepers deciding who is allowed to speak. If you control
          a domain, that control <em>is</em> the verification — nothing else is needed.
        </p>
        <p>
          <strong>Talk directly to the owner.</strong> Every account here is a domain, and behind every domain
          is its owner. Mention <span className="font-mono">@example.com</span> in a post or open a
          conversation from their profile — and you are talking to the person who controls that domain.
          Directly. No intermediaries, no middlemen with blue checks.
        </p>
        <p>
          <strong>Honesty over speculation.</strong> When a domain&apos;s DNS record changes, we record the
          provable fact — <em>Domain access changed</em> — and nothing more. We never guess why.
        </p>
        <p>
          <strong>Posts are historical documents.</strong> Every post keeps the fingerprint of the identity
          that published it. Forever.
        </p>
        <p>
          <strong>Text only.</strong> No avatars to curate, no videos to scroll past. Words are the product.
        </p>
        <p className="border-l-2 border-accent pl-4 font-medium">
          No usernames. No emails. No phone numbers.
          <br />
          Your domain is your identity.
        </p>
      </Section>

      <Section id="getting-started" title="Getting started">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Enter your domain on the{" "}
            <Link href="/connect" className="text-accent hover:underline">
              Connect
            </Link>{" "}
            page.
          </li>
          <li>
            Add one DNS record — we show you the exact TYPE / NAME / VALUE:
            <div className="mt-2 space-y-1 rounded border border-border bg-card p-3 font-mono text-sm">
              <div>
                <span className="text-muted">TYPE</span> TXT
              </div>
              <div>
                <span className="text-muted">NAME</span> _twtr{" "}
                <span className="text-muted">(or _twtr.yourdomain.com)</span>
              </div>
              <div>
                <span className="text-muted">VALUE</span> twtr=&lt;token&gt;
              </div>
            </div>
          </li>
          <li>
            Verify. We re-check automatically every 8 seconds; DNS propagation usually takes a few minutes.
            The challenge is valid for 15 minutes.
          </li>
        </ol>
        <p>That&apos;s it — you&apos;re in, with your emoji fingerprint.</p>
        <p>
          Signing in later is the same flow. The TXT value is public — anyone can <span className="font-mono">dig</span>{" "}
          it — which is why every login asks for a <em>fresh</em> record: only writing a new value proves you
          still control the domain <em>now</em>. Reading the old value proves nothing and never grants access.
        </p>
        <p>
          Because the value must be fresh, signing in from a new browser always starts a new identity period.
          To move an existing session between browsers, use{" "}
          <Link href="/settings" className="text-accent hover:underline">
            Settings → Transfer
          </Link>{" "}
          (QR) instead — no DNS change needed.
        </p>
        <p>
          Even easier: on the{" "}
          <Link href="/connect?mode=login" className="text-accent hover:underline">
            login page
          </Link>{" "}
          pick <em>Log in with a QR code</em> and scan it with a browser where you are already signed in —
          approving there signs this browser in with a copy of that session. No DNS, no new identity period.
        </p>
      </Section>

      <Section id="identity" title="Identity & fingerprints">
        <p>
          Your identity fingerprint is 5 emoji, derived deterministically from your domain and the current
          verification period. It can&apos;t be chosen, bought, or faked.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Within a session the record stays the same → same fingerprint, same identity.</li>
          <li>
            The record changes (rotation, new owner, or signing in from a new browser) → a new identity period
            begins, the profile records a <em>Domain access changed</em> event, and sessions authorized by the
            old record die.
          </li>
          <li>Old posts never change — they keep the fingerprint of the identity they were published under.</li>
        </ul>
        <p>
          Click the emoji next to any domain name to see its full identity history — every fingerprint the
          domain ever had, with periods.
        </p>
      </Section>

      <Section id="posting" title="Posting">
        <ul className="list-disc space-y-1 pl-5">
          <li>Up to 280 characters. Text only — by design, not a limitation of this sprint.</li>
          <li>Reply to any post; replies form threads.</li>
          <li>
            Mention a domain as <span className="font-mono">@domain.tld</span> — it becomes a link and lands
            in that domain&apos;s Mentions tab.
          </li>
          <li>Every post and message is cryptographically signed by the server — provable origin.</li>
        </ul>
      </Section>

      <Section id="feeds" title="Following & feeds">
        <p>
          Home has three tabs. <strong>Global</strong> — the whole public timeline, with Follow buttons right
          in the feed. <strong>Following</strong> — posts from the domains you follow (and your own).{" "}
          <strong>Mentions</strong> — where <span className="font-mono">@you</span> shows up.
        </p>
        <p>
          Follow from the feed or from a profile — posts of followed domains appear in your Following tab
          immediately.
        </p>
      </Section>

      <Section id="dm" title="Direct messages">
        <p>
          Open any profile → <strong>Message</strong>. DMs go straight to the owner of that domain — that is
          the point of domain identity: an address that reaches the person in control of it. No follower
          requirements, no approval queue.
        </p>
      </Section>

      <Section id="sessions" title="Multiple domains & sessions">
        <p>
          A session is a <em>browser</em>, not a domain.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Add domains</strong> — connect another domain from the same browser and switch between
            them from the sidebar or Settings at any time. Each added domain goes through its own DNS
            verification.
          </li>
          <li>
            <strong>Transfer to another device</strong> — Settings → Show QR code → scan it on the other
            browser. Codes are single-use and valid for 5 minutes; the new device gets its own, separately
            revocable session. Prefer this over re-verifying: it keeps your identity period and fingerprint.
          </li>
          <li>
            <strong>QR sign-in</strong> — the reverse direction: the <em>new</em> browser shows the QR (login
            page → Log in with a QR code) and a signed-in browser approves it by scanning. Same clone, same
            guarantees — single-use code, 5 minutes, own revocable session.
          </li>
          <li>
            <strong>Active sessions</strong> — Settings shows every browser where your domain is verified:
            device, last seen, and a Revoke button.
          </li>
          <li>
            If a domain&apos;s DNS record changes, that domain is stripped from every session that held it —
            a new owner inherits <em>nothing</em>, not even the other domains in those browsers.
          </li>
        </ul>
      </Section>

      <Section id="faq" title="FAQ">
        <p>
          <strong>Which domains can join?</strong> Any registrable domain in any zone — gTLD, ccTLD, IDN
          (punycode is fine), even twtr.dev itself if its owner connects it. DNS control is the only gate;
          we maintain no whitelist and no reserved names.
        </p>
        <p>
          <strong>Must I keep the TXT record?</strong> Yes — it&apos;s your login. Keep the current record in
          place; re-verify whenever you want to rotate the token.
        </p>
        <p>
          <strong>What if I lose the domain?</strong> Then you lose the identity — honestly, by design. The
          domain&apos;s next owner starts a new identity period; your old posts remain, with your
          fingerprint.
        </p>
        <p>
          <strong>Images? Video?</strong> Never. Text only.
        </p>
        <p>
          <strong>What does it cost?</strong> Nothing today. Paid subdomains — your own{" "}
          <span className="font-mono">_twtr</span> record on a subdomain — are planned as a Pro feature.
        </p>
      </Section>
    </div>
  );
}
