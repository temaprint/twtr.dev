import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "./data/twtr.db";

// The data directory may not exist yet (fresh checkout, docker build,
// first boot) — better-sqlite3 won't create it on its own.
mkdirSync(dirname(url), { recursive: true });

const globalForDb = globalThis as unknown as { __twtrDb?: ReturnType<typeof createDb> };

function createDb() {
  const sqlite = new Database(url);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export const db = globalForDb.__twtrDb ?? createDb();
if (!globalForDb.__twtrDb) globalForDb.__twtrDb = db;
