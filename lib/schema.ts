import { sqliteTable, text, integer, primaryKey, index, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const domains = sqliteTable(
  "domains",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    bio: text("bio"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("domains_name_idx").on(t.name)]
);

export const identities = sqliteTable(
  "identities",
  {
    id: text("id").primaryKey(),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    tokenHash: text("token_hash").notNull(),
    fingerprint: text("fingerprint").notNull(),
    // 'initial' | 'access_changed'
    changeType: text("change_type").notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("identities_domain_idx").on(t.domainId)]
);

export const challenges = sqliteTable(
  "challenges",
  {
    id: text("id").primaryKey(),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("challenges_domain_idx").on(t.domainId)]
);

// A session is a *browser*, not a domain. It can hold several verified
// domains (session_domains); one of them is active and speaks for the user.
// A session is a *browser*, not a domain. It can hold several verified
// domains (session_domains); one of them is active and speaks for the user.
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    activeDomainId: text("active_domain_id").references(() => domains.id, { onDelete: "set null" }),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("sessions_token_idx").on(t.tokenHash)]
);

// Domain bindings of a session. Each binding is tied to the identity under
// which the domain was verified in this browser — an access change elsewhere
// kills the binding (and the whole session if it was the last domain),
// so a new owner never inherits the rest of the session.
export const sessionDomains = sqliteTable(
  "session_domains",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    identityId: text("identity_id")
      .notNull()
      .references(() => identities.id, { onDelete: "cascade" }),
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.domainId] }),
    index("session_domains_domain_idx").on(t.domainId),
  ]
);

// One-time, short-lived codes to transfer a session to another browser
// (QR). Redeeming copies the domain bindings into a NEW session — each
// browser stays independently revocable.
export const sessionTransfers = sqliteTable(
  "session_transfers",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("session_transfers_code_idx").on(t.codeHash)]
);

// QR sign-ins from the login page: a new browser creates a code and shows a
// QR; an already-signed-in device scans it and approves; the new browser's
// next poll receives a clone of the approver's session (its own, separately
// revocable one). The code itself is the poll credential — hashed at rest,
// single use, 5-minute TTL, same trust model as session_transfers.
export const qrLogins = sqliteTable(
  "qr_logins",
  {
    id: text("id").primaryKey(),
    codeHash: text("code_hash").notNull(),
    // 'pending' | 'approved' | 'done'
    status: text("status").notNull(),
    // session that approved the login (source of the clone)
    sessionId: text("session_id").references(() => sessions.id, { onDelete: "set null" }),
    // user agent of the browser that created the request (shown to the approver)
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("qr_logins_code_idx").on(t.codeHash)]
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    authorDomainId: text("author_domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    authorIdentityId: text("author_identity_id")
      .notNull()
      .references(() => identities.id),
    text: text("text").notNull(),
    replyToId: text("reply_to_id").references((): AnySQLiteColumn => posts.id),
    signature: text("signature").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("posts_author_idx").on(t.authorDomainId),
    index("posts_created_idx").on(t.createdAt),
    index("posts_reply_idx").on(t.replyToId),
  ]
);

export const follows = sqliteTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    followedId: text("followed_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followedId] })]
);

export const mentions = sqliteTable(
  "mentions",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.domainId] })]
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    fromDomainId: text("from_domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    fromIdentityId: text("from_identity_id")
      .notNull()
      .references(() => identities.id),
    toDomainId: text("to_domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    signature: text("signature").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("messages_from_idx").on(t.fromDomainId),
    index("messages_to_idx").on(t.toDomainId),
    index("messages_created_idx").on(t.createdAt),
  ]
);
