import type { Book, BookStatus, ClubSnapshot, Review } from '../../shared/types.ts'

export type {
  Book,
  BookStatus,
  ClubSnapshot,
  Member,
  Nomination,
  Progress,
  Reaction,
  Review,
} from '../../shared/types.ts'

/* ------------------------------------------------------------------ *
 * Fetching
 * ------------------------------------------------------------------ */

export async function getSnapshot(): Promise<ClubSnapshot> {
  const res = await fetch('/api/club')
  if (!res.ok) throw new Error(`Could not load the club (${res.status})`)
  return (await res.json()) as ClubSnapshot
}

interface RequestOptions {
  method?: string
  body?: unknown
  memberId?: string | null
}

export async function request<T = unknown>(
  path: string,
  { method = 'GET', body, memberId }: RequestOptions = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(memberId ? { 'x-member-id': memberId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`
    throw new Error(message)
  }

  return data as T
}

export interface LookupResult {
  title: string
  author: string
  year: number | null
  pageCount: number | null
  genre: string | null
  coverUrl: string | null
}

export function lookupBooks(query: string): Promise<{ results: LookupResult[] }> {
  return request(`/lookup?q=${encodeURIComponent(query)}`)
}

/* ------------------------------------------------------------------ *
 * Small shared helpers
 * ------------------------------------------------------------------ */

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))

export function monthLabel(month: number, year: number, short = false): string {
  const name = (short ? MONTHS_SHORT : MONTHS)[month - 1] ?? ''
  return `${name} ${year}`
}

/** Sort key that puts books in reading order (oldest first). */
export function bookOrder(book: Book): number {
  return book.year * 12 + book.month
}

export function byReadingOrder(a: Book, b: Book): number {
  return bookOrder(a) - bookOrder(b)
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.round((Date.now() - then) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(-Math.round(seconds / size), unit)
    }
  }
  return 'just now'
}

export function ratingLabel(rating: number): string {
  return rating.toFixed(1).replace(/\.0$/, '')
}

export const STATUS_LABEL: Record<BookStatus, string> = {
  read: 'Read',
  current: 'Reading now',
  upcoming: 'Up next',
}

export function isReviewed(reviews: Review[], bookId: string, memberId: string): boolean {
  return reviews.some((r) => r.bookId === bookId && r.memberId === memberId)
}
