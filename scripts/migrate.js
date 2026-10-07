// Applies drizzle/*.sql migrations at container boot.
// Idempotent: tracks applied files in the _migrations table.
// (drizzle-kit is a devDependency and is not present in the runtime image,
// so we execute the generated SQL directly via better-sqlite3.)
const { readFileSync, readdirSync, existsSync } = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.DATABASE_URL || "./data/twtr.db";
const dir = path.join(__dirname, "..", "drizzle");

if (!existsSync(dir)) {
  console.error("[migrate] no drizzle/ directory found — skipping");
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)");

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const applied = db.prepare("SELECT 1 FROM _migrations WHERE name = ?").get(file);
  if (applied) continue;
  const sql = readFileSync(path.join(dir, file), "utf8");
  // PRAGMA foreign_keys is a no-op inside a transaction, so files that toggle
  // it (table rebuilds) must run in autocommit mode instead.
  if (/^\s*PRAGMA foreign_keys/m.test(sql)) {
    try {
      db.exec("PRAGMA foreign_keys=OFF;");
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(file, Date.now());
      db.exec("PRAGMA foreign_keys=ON;");
      console.log("[migrate] applied:", file);
    } catch (err) {
      db.exec("PRAGMA foreign_keys=ON;");
      console.error("[migrate] FAILED:", file, err.message);
      process.exit(1);
    }
    continue;
  }
  db.exec("BEGIN");
  try {
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(file, Date.now());
    db.exec("COMMIT");
    console.log("[migrate] applied:", file);
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("[migrate] FAILED:", file, err.message);
    process.exit(1);
  }
}

db.close();
