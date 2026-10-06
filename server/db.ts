import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

export const ROOT = path.resolve(import.meta.dirname, '..')

// Load .env if there is one, before anything reads process.env.
try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {
  // No .env file. Defaults below still apply.
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  dbPath: path.resolve(ROOT, process.env.DB_PATH ?? 'data/club.db'),
  clubName: process.env.CLUB_NAME?.trim() || '3SixBookClub',
  clubTagline:
    process.env.CLUB_TAGLINE?.trim() ||
    'One book a month.',
  passcode: process.env.CLUB_PASSCODE?.trim() || '',
  seedDemo: process.env.SEED_DEMO !== '0',
}

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true })

export const db = new Database(config.dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS members (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  emoji      TEXT NOT NULL DEFAULT '🙂',
  color      TEXT NOT NULL DEFAULT '#e0a458',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS books (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  author      TEXT NOT NULL DEFAULT '',
  cover_url   TEXT,
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        INTEGER NOT NULL,
  description TEXT,
  page_count  INTEGER,
  genre       TEXT,
  status      TEXT NOT NULL DEFAULT 'read' CHECK (status IN ('read','current','upcoming')),
  picker_id   TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (year, month)
);

CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY,
  book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  rating     REAL NOT NULL CHECK (rating BETWEEN 0.5 AND 5),
  body       TEXT,
  spoiler    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (book_id, member_id)
);

CREATE TABLE IF NOT EXISTS reactions (
  id         TEXT PRIMARY KEY,
  review_id  TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (review_id, member_id, emoji)
);

CREATE TABLE IF NOT EXISTS nominations (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  author     TEXT,
  note       TEXT,
  member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nomination_votes (
  nomination_id TEXT NOT NULL REFERENCES nominations(id) ON DELETE CASCADE,
  member_id     TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (nomination_id, member_id)
);

CREATE TABLE IF NOT EXISTS progress (
  book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  percent    INTEGER NOT NULL CHECK (percent BETWEEN 0 AND 100),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (book_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_member ON reviews(member_id);
CREATE INDEX IF NOT EXISTS idx_books_when ON books(year, month);
`)

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
