import type { Book, Member, Review } from './api.ts'
import { byReadingOrder, MONTHS_SHORT } from './api.ts'

/* ------------------------------------------------------------------ *
 * Rating maths
 * ------------------------------------------------------------------ */

export const RATING_BINS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const

/** Count of ratings in each 0.5-star bin, index 0 = 0.5 stars. */
export function distributionOf(ratings: number[]): number[] {
  return RATING_BINS.map((bin) => ratings.filter((r) => Math.abs(r - bin) < 0.001).length)
}

export function mean(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2) return sorted[mid] ?? null
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/** Population standard deviation, used as our "how much did we argue" score. */
export function spread(values: number[]): number | null {
  const m = mean(values)
  if (m === null || values.length < 2) return null
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export interface BookStats {
  bookId: string
  ratings: number[]
  average: number | null
  median: number | null
  spread: number | null
  count: number
  /** Count of reviews in each 0.5-star bin, index 0 = 0.5 stars. */
  distribution: number[]
  /** Total reactions left on this book's reviews. */
  reactions: number
}

export function computeBookStats(bookId: string, reviews: Review[], reactions = 0): BookStats {
  const ratings = reviews.filter((r) => r.bookId === bookId).map((r) => r.rating)
  const distribution = distributionOf(ratings)
  return {
    bookId,
    ratings,
    average: mean(ratings),
    median: median(ratings),
    spread: spread(ratings),
    count: ratings.length,
    distribution,
    reactions,
  }
}

export function computeAllBookStats(books: Book[], reviews: Review[]): Map<string, BookStats> {
  const map = new Map<string, BookStats>()
  for (const book of books) map.set(book.id, computeBookStats(book.id, reviews))
  return map
}

/** Club-wide average, ignoring how many members reviewed each book. */
export function clubAverage(reviews: Review[]): number | null {
  return mean(reviews.map((r) => r.rating))
}

/* ------------------------------------------------------------------ *
 * Members
 * ------------------------------------------------------------------ */

export interface MemberStats {
  memberId: string
  count: number
  average: number | null
  /** How much kinder (positive) or harsher (negative) than the club average. */
  generosity: number | null
  spread: number | null
  favoriteGenre: string | null
  distribution: number[]
}

export function computeMemberStats(
  memberId: string,
  reviews: Review[],
  books: Book[],
): MemberStats {
  const mine = reviews.filter((r) => r.memberId === memberId)
  const ratings = mine.map((r) => r.rating)
  const base = clubAverage(reviews)
  const avg = mean(ratings)

  const genreScores = new Map<string, number[]>()
  const bookById = new Map(books.map((b) => [b.id, b]))
  for (const review of mine) {
    const genre = bookById.get(review.bookId)?.genre
    if (!genre) continue
    const list = genreScores.get(genre) ?? []
    list.push(review.rating)
    genreScores.set(genre, list)
  }

  let favoriteGenre: string | null = null
  let best = -1
  for (const [genre, values] of genreScores) {
    const score = (mean(values) ?? 0) * Math.min(values.length, 3)
    if (score > best) {
      best = score
      favoriteGenre = genre
    }
  }

  return {
    memberId,
    count: ratings.length,
    average: avg,
    generosity: avg !== null && base !== null ? avg - base : null,
    spread: spread(ratings),
    favoriteGenre,
    distribution: distributionOf(ratings),
  }
}

/* ------------------------------------------------------------------ *
 * Taste matching
 * ------------------------------------------------------------------ */

/** Pearson correlation of two members' ratings over books they both reviewed. */
export function correlation(
  a: string,
  b: string,
  reviews: Review[],
): { value: number; shared: number } | null {
  const byBookA = new Map(reviews.filter((r) => r.memberId === a).map((r) => [r.bookId, r.rating]))
  const byBookB = new Map(reviews.filter((r) => r.memberId === b).map((r) => [r.bookId, r.rating]))

  const xs: number[] = []
  const ys: number[] = []
  for (const [bookId, x] of byBookA) {
    const y = byBookB.get(bookId)
    if (y === undefined) continue
    xs.push(x)
    ys.push(y)
  }

  if (xs.length < 3) return null

  const mx = mean(xs)
  const my = mean(ys)
  if (mx === null || my === null) return null

  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < xs.length; i += 1) {
    const a1 = (xs[i] ?? 0) - mx
    const b1 = (ys[i] ?? 0) - my
    num += a1 * b1
    dx += a1 * a1
    dy += b1 * b1
  }
  if (dx === 0 || dy === 0) return null

  return { value: num / Math.sqrt(dx * dy), shared: xs.length }
}

export interface TasteEntry {
  memberId: string
  value: number | null
  shared: number
}

export function tasteMatrix(members: Member[], reviews: Review[]): TasteEntry[][] {
  return members.map((a) =>
    members.map((b) =>
      a.id === b.id
        ? { memberId: b.id, value: 1, shared: reviews.filter((r) => r.memberId === a.id).length }
        : (() => {
            const result = correlation(a.id, b.id, reviews)
            return { memberId: b.id, value: result?.value ?? null, shared: result?.shared ?? 0 }
          })(),
    ),
  )
}

/** The member whose taste is closest to `memberId` (excluding themselves). */
export function tasteTwin(memberId: string, members: Member[], reviews: Review[]) {
  let best: { member: Member; value: number } | null = null
  for (const other of members) {
    if (other.id === memberId) continue
    const result = correlation(memberId, other.id, reviews)
    if (!result) continue
    if (!best || result.value > best.value) best = { member: other, value: result.value }
  }
  return best
}

/* ------------------------------------------------------------------ *
 * Superlatives
 * ------------------------------------------------------------------ */

export interface Superlative {
  key: string
  label: string
  headline: string
  detail: string
  /** Member or book id used to link through. */
  to?: string
  accent: string
}

export function computeSuperlatives(
  books: Book[],
  members: Member[],
  reviews: Review[],
): Superlative[] {
  const stats = [...computeAllBookStats(books, reviews).entries()]
  const rated = stats.filter(([, s]) => s.count >= 2)
  const out: Superlative[] = []

  const favourite = rated.reduce<[string, BookStats] | null>(
    (best, entry) => (!best || (entry[1].average ?? 0) > (best[1].average ?? 0) ? entry : best),
    null,
  )
  if (favourite) {
    const book = books.find((b) => b.id === favourite[0])
    out.push({
      key: 'favourite',
      label: 'Crowd favourite',
      headline: book?.title ?? '',
      detail: `Averaged ${(favourite[1].average ?? 0).toFixed(2)} from ${favourite[1].count} of us`,
      to: book ? `/books/${book.id}` : undefined,
      accent: 'text-ink',
    })
  }

  const divisive = rated.reduce<[string, BookStats] | null>(
    (best, entry) => (!best || (entry[1].spread ?? 0) > (best[1].spread ?? 0) ? entry : best),
    null,
  )
  if (divisive) {
    const book = books.find((b) => b.id === divisive[0])
    const lo = Math.min(...divisive[1].ratings)
    const hi = Math.max(...divisive[1].ratings)
    out.push({
      key: 'divisive',
      label: 'Most divisive',
      headline: book?.title ?? '',
      detail: `Ratings ran from ${lo} to ${hi} stars`,
      to: book ? `/books/${book.id}` : undefined,
      accent: 'text-ink',
    })
  }

  const memberStats = members
    .map((m) => ({ member: m, stats: computeMemberStats(m.id, reviews, books) }))
    .filter((entry) => entry.stats.count >= 2)

  const harshest = memberStats.reduce<{ member: Member; avg: number } | null>((best, entry) => {
    const avg = entry.stats.average
    if (avg === null) return best
    return !best || avg < best.avg ? { member: entry.member, avg } : best
  }, null)
  if (harshest) {
    out.push({
      key: 'harshest',
      label: 'Toughest critic',
      headline: harshest.member.name,
      detail: `Averages ${harshest.avg.toFixed(2)} stars, the lowest in the club`,
      to: `/members/${harshest.member.id}`,
      accent: 'text-ink',
    })
  }

  const kindest = memberStats.reduce<{ member: Member; avg: number } | null>((best, entry) => {
    const avg = entry.stats.average
    if (avg === null) return best
    return !best || avg > best.avg ? { member: entry.member, avg } : best
  }, null)
  if (kindest) {
    out.push({
      key: 'kindest',
      label: 'Most generous',
      headline: kindest.member.name,
      detail: `Hands out ${kindest.avg.toFixed(2)} stars on average`,
      to: `/members/${kindest.member.id}`,
      accent: 'text-ink',
    })
  }

  const mostActive = memberStats.reduce<{ member: Member; count: number } | null>(
    (best, entry) =>
      !best || entry.stats.count > best.count
        ? { member: entry.member, count: entry.stats.count }
        : best,
    null,
  )
  if (mostActive) {
    out.push({
      key: 'active',
      label: 'Never misses',
      headline: mostActive.member.name,
      detail: `Reviewed ${mostActive.count} of ${books.filter((b) => b.status !== 'upcoming').length} books`,
      to: `/members/${mostActive.member.id}`,
      accent: 'text-ink',
    })
  }

  return out
}

/* ------------------------------------------------------------------ *
 * Colour scales for heatmaps
 * ------------------------------------------------------------------ */

/** Monochrome heat scale: darker is a harsher score, lighter is keener. */
export function ratingColor(rating: number | null, alpha = 1): string {
  if (rating === null) return `hsl(0 0% 20% / ${alpha})`
  const t = Math.max(0, Math.min(1, (rating - 0.5) / 4.5))
  const light = 18 + t * 70
  return `hsl(0 0% ${light}% / ${alpha})`
}

/** Diverging scale for correlations: -1 dark, +1 light. */
export function correlationColor(value: number | null): string {
  if (value === null) return 'hsl(0 0% 18%)'
  const t = (value + 1) / 2
  const light = 16 + t * 68
  return `hsl(0 0% ${light}%)`
}

/* ------------------------------------------------------------------ *
 * Trend data for charts
 * ------------------------------------------------------------------ */

export interface TrendPoint {
  label: string
  title: string
  bookId: string
  club: number | null
  [memberId: string]: number | null | string
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function buildTrend(books: Book[], reviews: Review[]): TrendPoint[] {
  return [...books]
    .sort(byReadingOrder)
    .map((book) => {
      const bookReviews = reviews.filter((r) => r.bookId === book.id)
      const club = mean(bookReviews.map((r) => r.rating))
      const month = MONTHS_SHORT[book.month - 1] ?? ''
      const point: TrendPoint = {
        label: `${month} ’${String(book.year).slice(2)}`,
        title: book.title,
        bookId: book.id,
        club: club === null ? null : round2(club),
      }
      for (const review of bookReviews) point[review.memberId] = review.rating
      return point
    })
}
