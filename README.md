# twtr.dev

![favicon/favicon-180x180.png](favicon/favicon-180x180.png)

**Connect your domain. Post as your domain. Talk to other domains.**

> No usernames. No emails. No phone numbers.
> **Your domain is your identity.**

Live at **[twtr.dev](https://twtr.dev)** · new here? Read the **[docs](https://twtr.dev/docs)**.

---

## The idea

I built twtr.dev around a simple idea:

**The web already has identities. We just never used them.**

Every website already has a domain.

You control `example.com`.
You control its DNS.

So why create another username, email, password and profile just to join another social network?

twtr.dev takes a different approach.

**Your domain is your identity.**

## How you join

Add one DNS TXT record:

```
TYPE   TXT
NAME   _twtr
VALUE  twtr=<one-time token>
```

Then verify. That's it — you're in.

- No email.
- No phone.
- No password.
- No ID verification.

Writing a **fresh** record is the only proof of control. The TXT value is public — anyone can `dig` it — so reading it never grants access; only publishing a new value proves you still control the domain *now*. DNS itself is the login and the recovery. There is nothing to forget and nothing to phish.

## The fingerprint

Every verification period gets a deterministic **5-emoji identity fingerprint**. For example:

**🦊 🌊 🚀 🍕 🌴**

It is derived from your domain and the current verification period — it can't be chosen, bought, or faked. It appears on your profile, on every post, and in every DM.

## Identity has history

Here's the interesting part: your *identity* is not the DNS token.

If domain access changes — maybe the domain was sold, maybe DNS access changed, maybe someone simply rotated the record — twtr records the provable fact: **Domain access changed**.

We never guess why. The system records what happened, not what we think happened.

A new verification period begins with a new fingerprint, and **old posts keep the fingerprint they were published with — forever.** Posts are historical documents. The history stays visible, honestly, on every profile.

## The domain is the address

Communication is direct:

→ follow a domain
→ mention a domain — `@example.com`
→ reply to a domain
→ DM a domain directly

No handles to squat, no nicknames to impersonate, no blue checks to buy. Behind every account is a domain, and behind every domain is its owner. When you mention a domain, you are talking to the person who controls it *right now*. Directly.

## Text only. On purpose.

For now — and by design — twtr is text-only.

No avatars. No videos. No GIFs. No endless media feed.

Just domains, identities, and conversations. Words are the product.

## Iron rules

These are not preferences. They are the point:

1. **Text only, forever.** No images, audio, video, or files.
2. **DNS is the only gate.** No emails, phones, passwords, OAuth — ever.
3. **Honesty over speculation.** We record provable facts ("Domain access changed"), never invent reasons.
4. **Posts are historical documents.** Old posts never change and keep their fingerprints.
5. **No gatekeeping.** No TLD whitelist, no reserved names — any registrable domain can join, even ours.

## What's inside

- 🔑 DNS-challenge verification — 15-minute one-time tokens, fresh-record proof, automatic re-checks
- 😊 Deterministic emoji fingerprints with full identity history per domain
- 📝 Posts, replies, threads, mentions, follows — Global / Following / Mentions tabs
- ✉️ Direct messages to any domain, no follower requirements
- ✍️ Server-signed posts and messages (HMAC-SHA256) — provable origin
- 🖥 A session is a *browser*, not a domain: verify many domains, switch between them anytime
- 📱 QR sign-in and session transfer between browsers, with per-device revocation
- 🌗 Auto light/dark, mobile-first, text-only UI
- 📚 A built-in [docs](https://twtr.dev/docs) page with the manifesto

## Run it locally

```bash
git clone https://github.com/<you>/twtr.dev && cd twtr.dev
npm install

cp .env.example .env        # set TWTR_SECRET to any random string
node scripts/migrate.js     # apply drizzle/*.sql to data/twtr.db

npm run dev                 # http://localhost:3000
```

**Dev tip — no real DNS needed:** set `TWTR_MOCK_DNS=1` in `.env` and use any `*.test` domain (like `demo.test`). The mock resolver publishes the TXT record for you, so you can walk through the whole flow — connect, post, reply, follow, DM — in seconds.

**Stack:** Next.js (App Router, TypeScript) · Tailwind v4 · SQLite (better-sqlite3) · Drizzle ORM · `node:dns` · react-qr-code.

**Production:** `docker compose up -d --build` — migrations run automatically at container boot. The database is a single SQLite file on a volume; back it up and you've backed up the network.

## Project structure

```
app/
  (app)/            home, profiles /[domain], messages, settings, docs
  connect/          domain verification (connect + login)
  transfer/         QR redeem + QR approve screens
  api/              domains, verify, session(s), qr-login, posts, feed, messages
components/         UI: PostCard, Composer, FaviconSwitcher, QR, …
lib/                the heart: dns, verify, session, fingerprint, sign, schema
drizzle/            SQL migrations (applied by scripts/migrate.js)
scripts/migrate.js  idempotent boot-time migrator
```

## Join in

I built this as an experiment around one question:

**What happens if we stop creating artificial identities and start using the identities the web already has?**

I'd love to hear what you think — and I'd love you to build with me.

- **Try it** — connect your domain at [twtr.dev/connect](https://twtr.dev/connect) and say hi: post a `@twtr.dev` mention or open a DM. That's the on-brand way to reach the owner. 🙂
- **Open issues** for bugs, edge cases, DNS-provider quirks, spec ideas — sharp reports are contributions too.
- **Send PRs** — small and focused beats big and brave. New features must respect the iron rules above (yes, that means your image-upload PR will be closed with respect and a link to this README).
- **Argue with the philosophy** — if you think an iron rule is wrong, open a discussion and make the case. Rules here were adopted after arguments; they can only be changed by better ones.
- **Self-host and poke at it** — it's one container and one SQLite file. Break things, report back.

The repository grows the same way the network does: domains join it by proving control, contributors join it by proving care.

---

<div align="center">

**No usernames. No emails. No phone numbers.**

**Your domain is your identity.**

</div>
