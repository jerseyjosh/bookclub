import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import {
  memberExists,
  bookExists,
  createBook,
  createMember,
  createNomination,
  deleteBook,
  deleteMember,
  deleteNomination,
  readSnapshot,
  setProgress,
  toggleNominationVote,
  toggleReaction,
  updateBook,
  updateMember,
  upsertReview,
} from './store.ts'
import { config, db } from './db.ts'

export const api = Router()

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** The client sends the member it thinks it is in this header. */
function actor(req: Request): string | null {
  const id = req.header('x-member-id')
  return id && memberExists(id) ? id : null
}

function param(req: Request, name: string): string {
  const value = (req.params as Record<string, string | string[] | undefined>)[name]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function fail(res: Response, status: number, message: string) {
  res.status(status).json({ error: message })
}

const handle =
  (fn: (req: Request, res: Response) => void) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      fn(req, res)
    } catch (err) {
      next(err)
    }
  }

/** Turn zod issues into one readable sentence. */
function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value)
  if (result.success) return result.data
  const issue = result.error.issues[0]
  const path = issue?.path.join('.')
  throw Object.assign(new Error(`${path ? `${path}: ` : ''}${issue?.message ?? 'Invalid input'}`), {
    status: 400,
  })
}

/* ------------------------------------------------------------------ *
 * Read
 * ------------------------------------------------------------------ */

api.get('/club', (_req, res) => {
  res.json(readSnapshot())
})

api.get('/health', (_req, res) => {
  res.json({ ok: true, db: config.dbPath })
})

/* ------------------------------------------------------------------ *
 * Members
 * ------------------------------------------------------------------ */

const memberSchema = z.object({
  name: z.string().trim().min(1, 'Pick a name').max(30),
  emoji: z.string().trim().max(8).optional(),
  color: z.string().trim().max(20).optional(),
  passcode: z.string().optional(),
})

api.post(
  '/members',
  handle((req, res) => {
    const input = parse(memberSchema, req.body)
    if (config.passcode && input.passcode !== config.passcode) {
      return fail(res, 403, 'Wrong club passcode.')
    }
    res.status(201).json(createMember(input))
  }),
)

const memberPatchSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  emoji: z.string().trim().max(8).optional(),
  color: z.string().trim().max(20).optional(),
})

api.patch(
  '/members/:id',
  handle((req, res) => {
    const id = param(req, 'id')
    if (actor(req) !== id) return fail(res, 403, 'You can only edit your own profile.')
    const member = updateMember(id, parse(memberPatchSchema, req.body))
    if (!member) return fail(res, 404, 'No such member.')
    res.json(member)
  }),
)

api.delete(
  '/members/:id',
  handle((req, res) => {
    const id = param(req, 'id')
    if (actor(req) !== id) return fail(res, 403, 'You can only remove yourself.')
    deleteMember(id)
    res.json({ ok: true })
  }),
)

/* ------------------------------------------------------------------ *
 * Books
 * ------------------------------------------------------------------ */

const bookSchema = z.object({
  title: z.string().trim().min(1, 'A book needs a title').max(200),
  author: z.string().trim().max(120).default(''),
  coverUrl: z.string().trim().max(500).nullish(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(1900).max(2200),
  description: z.string().trim().max(1000).nullish(),
  pageCount: z.number().int().min(1).max(20000).nullish(),
  genre: z.string().trim().max(60).nullish(),
  status: z.enum(['read', 'current', 'upcoming']).default('read'),
  pickerId: z.string().nullish(),
})

api.post(
  '/books',
  handle((req, res) => {
    if (!actor(req)) return fail(res, 403, 'Choose who you are first.')
    const input = parse(bookSchema, req.body)
    try {
      res.status(201).json(createBook(input))
    } catch (err) {
      if (String(err).includes('UNIQUE')) {
        return fail(res, 409, 'That month already has a book. Edit it instead.')
      }
      throw err
    }
  }),
)

const bookPatchSchema = bookSchema.partial()

api.patch(
  '/books/:id',
  handle((req, res) => {
    if (!actor(req)) return fail(res, 403, 'Choose who you are first.')
    const book = updateBook(param(req, 'id'), parse(bookPatchSchema, req.body))
    if (!book) return fail(res, 404, 'No such book.')
    res.json(book)
  }),
)

api.delete(
  '/books/:id',
  handle((req, res) => {
    if (!actor(req)) return fail(res, 403, 'Choose who you are first.')
    deleteBook(param(req, 'id'))
    res.json({ ok: true })
  }),
)

/* ------------------------------------------------------------------ *
 * Reviews
 * ------------------------------------------------------------------ */

const reviewSchema = z.object({
  bookId: z.string().min(1),
  memberId: z.string().min(1),
  rating: z
    .number()
    .min(0.5)
    .max(5)
    .refine((n) => Number.isInteger(n * 2), 'Ratings go in half stars'),
  body: z.string().trim().max(5000).nullish(),
  spoiler: z.boolean().optional(),
})

api.put(
  '/reviews',
  handle((req, res) => {
    const input = parse(reviewSchema, req.body)
    if (actor(req) !== input.memberId) return fail(res, 403, 'You can only post your own review.')
    if (!bookExists(input.bookId)) return fail(res, 404, 'No such book.')
    res.json(upsertReview(input))
  }),
)

api.delete(
  '/reviews/:id',
  handle((req, res) => {
    const me = actor(req)
    if (!me) return fail(res, 403, 'Choose who you are first.')
    const row = db.prepare(`SELECT member_id FROM reviews WHERE id = ?`).get(param(req, 'id')) as
      | { member_id: string }
      | undefined
    if (!row) return fail(res, 404, 'No such review.')
    if (row.member_id !== me) return fail(res, 403, 'That is not your review.')
    db.prepare(`DELETE FROM reviews WHERE id = ?`).run(param(req, 'id'))
    res.json({ ok: true })
  }),
)

/* ------------------------------------------------------------------ *
 * Reactions
 * ------------------------------------------------------------------ */

api.post(
  '/reactions/toggle',
  handle((req, res) => {
    const input = parse(
      z.object({
        reviewId: z.string().min(1),
        emoji: z.string().trim().min(1).max(8),
      }),
      req.body,
    )
    const me = actor(req)
    if (!me) return fail(res, 403, 'Choose who you are first.')
    res.json({ active: toggleReaction(input.reviewId, me, input.emoji) })
  }),
)

/* ------------------------------------------------------------------ *
 * Nominations (what we read next)
 * ------------------------------------------------------------------ */

api.post(
  '/nominations',
  handle((req, res) => {
    const me = actor(req)
    if (!me) return fail(res, 403, 'Choose who you are first.')
    const input = parse(
      z.object({
        title: z.string().trim().min(1, 'A nomination needs a title').max(200),
        author: z.string().trim().max(120).nullish(),
        note: z.string().trim().max(500).nullish(),
      }),
      req.body,
    )
    res.status(201).json(createNomination({ ...input, memberId: me }))
  }),
)

api.post(
  '/nominations/:id/vote',
  handle((req, res) => {
    const me = actor(req)
    if (!me) return fail(res, 403, 'Choose who you are first.')
    const exists = db
      .prepare(`SELECT 1 FROM nominations WHERE id = ?`)
      
      .get(param(req, 'id'))
    if (!exists) return fail(res, 404, 'No such nomination.')
    res.json({ active: toggleNominationVote(param(req, 'id'), me) })
  }),
)

api.delete(
  '/nominations/:id',
  handle((req, res) => {
    const me = actor(req)
    if (!me) return fail(res, 403, 'Choose who you are first.')
    const row = db.prepare(`SELECT member_id FROM nominations WHERE id = ?`).get(
      param(req, 'id'),
    ) as { member_id: string } | undefined
    if (!row) return fail(res, 404, 'No such nomination.')
    if (row.member_id !== me) return fail(res, 403, 'Only the nominator can remove it.')
    deleteNomination(param(req, 'id'))
    res.json({ ok: true })
  }),
)

/* ------------------------------------------------------------------ *
 * Reading progress
 * ------------------------------------------------------------------ */

api.put(
  '/progress',
  handle((req, res) => {
    const me = actor(req)
    if (!me) return fail(res, 403, 'Choose who you are first.')
    const input = parse(
      z.object({
        bookId: z.string().min(1),
        percent: z.number().int().min(0).max(100),
      }),
      req.body,
    )
    setProgress(input.bookId, me, input.percent)
    res.json({ ok: true })
  }),
)

/* ------------------------------------------------------------------ *
 * Book lookup (optional convenience when adding a book)
 * ------------------------------------------------------------------ */

interface OpenLibraryDoc {
  title?: string
  author_name?: string[]
  first_publish_year?: number
  number_of_pages_median?: number
  cover_i?: number
  subject?: string[]
  isbn?: string[]
}

api.get(
  '/lookup',
  handle(async (req, res) => {
    const q = String(req.query.q ?? '').trim()
    if (q.length < 2) return res.json({ results: [] })

    const url = new URL('https://openlibrary.org/search.json')
    url.searchParams.set('q', q)
    url.searchParams.set('limit', '6')
    url.searchParams.set(
      'fields',
      'title,author_name,first_publish_year,number_of_pages_median,cover_i,subject,isbn',
    )

    try {
      const upstream = await fetch(url, {
        headers: { 'user-agent': 'bookclub-selfhosted/1.0' },
        signal: AbortSignal.timeout(6000),
      })
      if (!upstream.ok) throw new Error(`Open Library said ${upstream.status}`)
      const data = (await upstream.json()) as { docs?: OpenLibraryDoc[] }
      const results = (data.docs ?? []).slice(0, 6).map((doc) => ({
        title: doc.title ?? 'Untitled',
        author: doc.author_name?.[0] ?? '',
        year: doc.first_publish_year ?? null,
        pageCount: doc.number_of_pages_median ?? null,
        genre: doc.subject?.[0] ?? null,
        coverUrl: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : null,
      }))
      res.json({ results })
    } catch {
      // No internet on the host? Not a problem, the form still works.
      res.json({ results: [], offline: true })
    }
  }),
)
