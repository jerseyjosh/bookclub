import { db, config, newId, nowIso } from './db.ts'
import type {
  Book,
  BookInput,
  BookStatus,
  ClubSnapshot,
  Member,
  Nomination,
  NominationInput,
  Progress,
  Reaction,
  Review,
  ReviewInput,
} from '../shared/types.ts'

/* ------------------------------------------------------------------ *
 * Row mapping
 * ------------------------------------------------------------------ */

type Row = Record<string, unknown>

const str = (v: unknown): string => String(v ?? '')
const strOrNull = (v: unknown): string | null =>
  v === null || v === undefined || v === '' ? null : String(v)
const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v)

function toMember(r: Row): Member {
  return {
    id: str(r.id),
    name: str(r.name),
    emoji: str(r.emoji),
    color: str(r.color),
    joinedAt: str(r.created_at),
  }
}

function toBook(r: Row): Book {
  return {
    id: str(r.id),
    title: str(r.title),
    author: str(r.author),
    coverUrl: strOrNull(r.cover_url),
    month: Number(r.month),
    year: Number(r.year),
    description: strOrNull(r.description),
    pageCount: numOrNull(r.page_count),
    genre: strOrNull(r.genre),
    status: str(r.status) as BookStatus,
    pickerId: strOrNull(r.picker_id),
    createdAt: str(r.created_at),
  }
}

function toReview(r: Row): Review {
  return {
    id: str(r.id),
    bookId: str(r.book_id),
    memberId: str(r.member_id),
    rating: Number(r.rating),
    body: strOrNull(r.body),
    spoiler: Boolean(r.spoiler),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  }
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

export function readSnapshot(): ClubSnapshot {
  const members = db
    .prepare(`SELECT * FROM members ORDER BY name COLLATE NOCASE`)
    .all() as Row[]
  const books = db
    .prepare(`SELECT * FROM books ORDER BY year DESC, month DESC`)
    .all() as Row[]
  const reviews = db
    .prepare(`SELECT * FROM reviews ORDER BY created_at DESC`)
    .all() as Row[]
  const reactions = db
    .prepare(`SELECT * FROM reactions ORDER BY created_at ASC`)
    .all() as Row[]
  const progress = db.prepare(`SELECT * FROM progress`).all() as Row[]
  const nominations = db
    .prepare(`SELECT * FROM nominations ORDER BY created_at DESC`)
    .all() as Row[]
  const votes = db
    .prepare(`SELECT nomination_id, member_id FROM nomination_votes`)
    .all() as Row[]

  const votesByNomination = new Map<string, string[]>()
  for (const v of votes) {
    const key = str(v.nomination_id)
    const list = votesByNomination.get(key) ?? []
    list.push(str(v.member_id))
    votesByNomination.set(key, list)
  }

  return {
    club: {
      name: config.clubName,
      tagline: config.clubTagline,
      passcodeRequired: Boolean(config.passcode),
    },
    members: members.map(toMember),
    books: books.map(toBook),
    reviews: reviews.map(toReview),
    reactions: reactions.map(
      (r): Reaction => ({
        id: str(r.id),
        reviewId: str(r.review_id),
        memberId: str(r.member_id),
        emoji: str(r.emoji),
      }),
    ),
    nominations: nominations.map(
      (n): Nomination => ({
        id: str(n.id),
        title: str(n.title),
        author: strOrNull(n.author),
        note: strOrNull(n.note),
        memberId: str(n.member_id),
        createdAt: str(n.created_at),
        voterIds: votesByNomination.get(str(n.id)) ?? [],
      }),
    ),
    progress: progress.map(
      (p): Progress => ({
        bookId: str(p.book_id),
        memberId: str(p.member_id),
        percent: Number(p.percent),
        updatedAt: str(p.updated_at),
      }),
    ),
  }
}

export function memberExists(id: string): boolean {
  return Boolean(db.prepare(`SELECT 1 FROM members WHERE id = ?`).get(id))
}

export function bookExists(id: string): boolean {
  return Boolean(db.prepare(`SELECT 1 FROM books WHERE id = ?`).get(id))
}

export function isSeeded(): boolean {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM members`).get() as Row
  return Number(row.n) > 0
}

/* ------------------------------------------------------------------ *
 * Writes
 * ------------------------------------------------------------------ */

const PALETTE = [
  '#e0a458',
  '#7fb069',
  '#d96c6c',
  '#6c8ed9',
  '#b98bd9',
  '#e08fbf',
  '#5fb3b3',
  '#d9c26c',
]

export function createMember(input: {
  name: string
  emoji?: string
  color?: string
}): Member {
  const name = input.name.trim()
  const existing = db
    .prepare(`SELECT * FROM members WHERE name = ? COLLATE NOCASE`)
    .get(name) as Row | undefined
  if (existing) return toMember(existing)

  const count = Number(
    (db.prepare(`SELECT COUNT(*) AS n FROM members`).get() as Row).n,
  )
  const id = newId('mbr')
  db.prepare(
    `INSERT INTO members (id, name, emoji, color, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(
    id,
    name,
    input.emoji ?? '🙂',
    input.color ?? PALETTE[count % PALETTE.length] ?? PALETTE[0]!,
    nowIso(),
  )
  return toMember(db.prepare(`SELECT * FROM members WHERE id = ?`).get(id) as Row)
}

export function updateMember(
  id: string,
  patch: { name?: string; emoji?: string; color?: string },
): Member | null {
  const current = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id) as
    | Row
    | undefined
  if (!current) return null
  db.prepare(`UPDATE members SET name = ?, emoji = ?, color = ? WHERE id = ?`).run(
    patch.name?.trim() || str(current.name),
    patch.emoji || str(current.emoji),
    patch.color || str(current.color),
    id,
  )
  return toMember(db.prepare(`SELECT * FROM members WHERE id = ?`).get(id) as Row)
}

export function deleteMember(id: string): void {
  db.prepare(`DELETE FROM members WHERE id = ?`).run(id)
}

export function createBook(input: BookInput): Book {
  const id = newId('bk')
  db.prepare(
    `INSERT INTO books
       (id, title, author, cover_url, month, year, description, page_count, genre, status, picker_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title.trim(),
    (input.author ?? '').trim(),
    input.coverUrl?.trim() || null,
    input.month,
    input.year,
    input.description?.trim() || null,
    input.pageCount ?? null,
    input.genre?.trim() || null,
    input.status ?? 'read',
    input.pickerId || null,
    nowIso(),
  )
  return toBook(db.prepare(`SELECT * FROM books WHERE id = ?`).get(id) as Row)
}

export function updateBook(id: string, patch: Partial<BookInput>): Book | null {
  const current = db.prepare(`SELECT * FROM books WHERE id = ?`).get(id) as
    | Row
    | undefined
  if (!current) return null
  const merged = { ...toBook(current), ...patch }
  db.prepare(
    `UPDATE books SET title = ?, author = ?, cover_url = ?, month = ?, year = ?,
       description = ?, page_count = ?, genre = ?, status = ?, picker_id = ?
     WHERE id = ?`,
  ).run(
    merged.title.trim(),
    (merged.author ?? '').trim(),
    merged.coverUrl?.trim() || null,
    merged.month,
    merged.year,
    merged.description?.trim() || null,
    merged.pageCount ?? null,
    merged.genre?.trim() || null,
    merged.status,
    merged.pickerId || null,
    id,
  )
  return toBook(db.prepare(`SELECT * FROM books WHERE id = ?`).get(id) as Row)
}

export function deleteBook(id: string): void {
  db.prepare(`DELETE FROM books WHERE id = ?`).run(id)
}

export function upsertReview(input: ReviewInput): Review {
  const existing = db
    .prepare(`SELECT * FROM reviews WHERE book_id = ? AND member_id = ?`)
    .get(input.bookId, input.memberId) as Row | undefined

  if (existing) {
    db.prepare(
      `UPDATE reviews SET rating = ?, body = ?, spoiler = ?, updated_at = ? WHERE id = ?`,
    ).run(
      input.rating,
      input.body?.trim() || null,
      input.spoiler ? 1 : 0,
      nowIso(),
      str(existing.id),
    )
    return toReview(
      db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(str(existing.id)) as Row,
    )
  }

  const id = newId('rev')
  db.prepare(
    `INSERT INTO reviews (id, book_id, member_id, rating, body, spoiler, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.bookId,
    input.memberId,
    input.rating,
    input.body?.trim() || null,
    input.spoiler ? 1 : 0,
    nowIso(),
    nowIso(),
  )
  return toReview(db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(id) as Row)
}

export function toggleReaction(
  reviewId: string,
  memberId: string,
  emoji: string,
): boolean {
  const existing = db
    .prepare(
      `SELECT id FROM reactions WHERE review_id = ? AND member_id = ? AND emoji = ?`,
    )
    .get(reviewId, memberId, emoji) as Row | undefined
  if (existing) {
    db.prepare(`DELETE FROM reactions WHERE id = ?`).run(str(existing.id))
    return false
  }
  db.prepare(
    `INSERT INTO reactions (id, review_id, member_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(newId('rxn'), reviewId, memberId, emoji, nowIso())
  return true
}

export function createNomination(input: NominationInput): Nomination {
  const id = newId('nom')
  db.prepare(
    `INSERT INTO nominations (id, title, author, note, member_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title.trim(),
    input.author?.trim() || null,
    input.note?.trim() || null,
    input.memberId,
    nowIso(),
  )
  // Nominating is also a vote for yourself.
  db.prepare(
    `INSERT OR IGNORE INTO nomination_votes (nomination_id, member_id, created_at) VALUES (?, ?, ?)`,
  ).run(id, input.memberId, nowIso())
  const row = db.prepare(`SELECT * FROM nominations WHERE id = ?`).get(id) as Row
  return {
    id: str(row.id),
    title: str(row.title),
    author: strOrNull(row.author),
    note: strOrNull(row.note),
    memberId: str(row.member_id),
    createdAt: str(row.created_at),
    voterIds: [input.memberId],
  }
}

export function toggleNominationVote(nominationId: string, memberId: string): boolean {
  const existing = db
    .prepare(
      `SELECT 1 FROM nomination_votes WHERE nomination_id = ? AND member_id = ?`,
    )
    .get(nominationId, memberId)
  if (existing) {
    db.prepare(
      `DELETE FROM nomination_votes WHERE nomination_id = ? AND member_id = ?`,
    ).run(nominationId, memberId)
    return false
  }
  db.prepare(
    `INSERT INTO nomination_votes (nomination_id, member_id, created_at) VALUES (?, ?, ?)`,
  ).run(nominationId, memberId, nowIso())
  return true
}

export function deleteNomination(id: string): void {
  db.prepare(`DELETE FROM nominations WHERE id = ?`).run(id)
}

export function setProgress(bookId: string, memberId: string, percent: number): void {
  db.prepare(
    `INSERT INTO progress (book_id, member_id, percent, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(book_id, member_id) DO UPDATE SET percent = excluded.percent, updated_at = excluded.updated_at`,
  ).run(bookId, memberId, percent, nowIso())
}

export function resetAll(): void {
  db.exec(`
    DELETE FROM reactions;
    DELETE FROM reviews;
    DELETE FROM progress;
    DELETE FROM nomination_votes;
    DELETE FROM nominations;
    DELETE FROM books;
    DELETE FROM members;
  `)
}
