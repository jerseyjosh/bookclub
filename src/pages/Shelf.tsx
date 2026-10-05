import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookFormModal } from '../components/BookForm.tsx'
import { AvatarStack, Button, Chip, Cover, EmptyState, SectionHeading, Stars } from '../components/ui.tsx'
import { byReadingOrder, monthLabel, type BookStatus } from '../lib/api.ts'
import { useClub, useSnapshot } from '../lib/club.tsx'
import { computeAllBookStats } from '../lib/stats.ts'

type Filter = 'all' | BookStatus
type Sort = 'newest' | 'oldest' | 'rating' | 'talked-about'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'read', label: 'Read' },
  { key: 'current', label: 'Reading now' },
  { key: 'upcoming', label: 'Up next' },
]

const SORTS: { key: Sort; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'rating', label: 'Highest rated' },
  { key: 'talked-about', label: 'Most reviewed' },
]

export function Shelf() {
  const snapshot = useSnapshot()
  const { me } = useClub()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [adding, setAdding] = useState(false)

  const { books, members, reviews, reactions, progress } = snapshot

  const stats = useMemo(() => computeAllBookStats(books, reviews), [books, reviews])
  const reactionCounts = useMemo(() => {
    const reviewBook = new Map(reviews.map((r) => [r.id, r.bookId]))
    const counts = new Map<string, number>()
    for (const reaction of reactions) {
      const bookId = reviewBook.get(reaction.reviewId)
      if (!bookId) continue
      counts.set(bookId, (counts.get(bookId) ?? 0) + 1)
    }
    return counts
  }, [reactions, reviews])

  const visible = useMemo(() => {
    const list = books.filter((book) => filter === 'all' || book.status === filter)
    return list.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return byReadingOrder(a, b)
        case 'rating':
          return (stats.get(b.id)?.average ?? -1) - (stats.get(a.id)?.average ?? -1)
        case 'talked-about':
          return (stats.get(b.id)?.count ?? 0) - (stats.get(a.id)?.count ?? 0)
        default:
          return byReadingOrder(b, a)
      }
    })
  }, [books, filter, sort, stats])

  const readBooks = books.filter((b) => b.status !== 'upcoming')
  const totalPages = readBooks.reduce((acc, b) => acc + (b.pageCount ?? 0), 0)
  const reviewedBooks = readBooks.filter((b) => (stats.get(b.id)?.count ?? 0) > 0).length

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="The shelf"
        subtitle="Everything we have read together, and everything we are about to."
        action={
          me ? (
            <Button variant="primary" onClick={() => setAdding(true)}>
              + Add a book
            </Button>
          ) : (
            <span className="text-xs text-faint">Join the club to add books</span>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Books read</p>
          <p className="stat-num mt-2">{readBooks.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">
            Pages between us
          </p>
          <p className="stat-num mt-2">{totalPages.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Rated</p>
          <p className="stat-num mt-2">
            {reviewedBooks}
            <span className="text-sm text-faint"> / {readBooks.length}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            onClick={() => setFilter(option.key)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition ${
              filter === option.key
                ? 'border-amber/60 bg-amber/15 text-amber'
                : 'border-line bg-raised/50 text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        ))}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="input ml-auto w-auto py-1.5 text-xs"
          aria-label="Sort books"
        >
          {SORTS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="🔍" title="Nothing here yet">
          Try another filter, or add a book to this month.
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((book) => {
            const bookStats = stats.get(book.id)
            const reviewers = reviews
              .filter((r) => r.bookId === book.id)
              .map((r) => members.find((m) => m.id === r.memberId))
              .filter((m): m is NonNullable<typeof m> => Boolean(m))
            const readersNow = progress.filter((p) => p.bookId === book.id).length

            return (
              <Link
                key={book.id}
                to={`/books/${book.id}`}
                className="card card-hover animate-rise group flex flex-col overflow-hidden"
              >
                <div className="relative aspect-2/3 w-full overflow-hidden bg-raised">
                  <div className="h-full w-full transition duration-300 group-hover:scale-[1.03]">
                    <Cover title={book.title} author={book.author} coverUrl={book.coverUrl} />
                  </div>
                  {book.status === 'current' && (
                    <span className="absolute top-2 left-2 rounded-full bg-void/85 px-2 py-1 text-[10px] text-amber backdrop-blur">
                      ● Reading now
                    </span>
                  )}
                  {book.status === 'upcoming' && (
                    <span className="absolute top-2 left-2 rounded-full bg-void/85 px-2 py-1 text-[10px] text-sky backdrop-blur">
                      Up next
                    </span>
                  )}
                  {bookStats?.average != null && (
                    <span className="absolute right-2 bottom-2 rounded-full bg-void/85 px-2 py-1 text-xs text-amber backdrop-blur">
                      ★ {bookStats.average.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs text-faint">{monthLabel(book.month, book.year)}</p>
                  <h3 className="mt-1 font-display text-lg leading-tight">{book.title}</h3>
                  <p className="mt-0.5 text-sm text-muted">{book.author}</p>

                  <div className="mt-3 flex items-center gap-2">
                    <Stars value={bookStats?.average ?? null} size={13} />
                    <span className="text-xs text-faint">
                      {bookStats?.count ?? 0} {bookStats?.count === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <AvatarStack members={reviewers} size={24} max={5} />
                    <div className="flex items-center gap-1.5">
                      {readersNow > 0 && (
                        <Chip tone="sage">{readersNow} reading</Chip>
                      )}
                      {(reactionCounts.get(book.id) ?? 0) > 0 && (
                        <span className="text-xs text-faint">
                          {reactionCounts.get(book.id)} 💬
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <BookFormModal open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
