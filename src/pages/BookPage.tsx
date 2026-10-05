import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookFormModal } from '../components/BookForm.tsx'
import { ReviewCard, ReviewEditor } from '../components/Reviews.tsx'
import { RatingDistribution } from '../components/charts.tsx'
import {
  Avatar,
  Button,
  Chip,
  Cover,
  EmptyState,
  MemberPill,
  SectionHeading,
  Stars,
} from '../components/ui.tsx'
import { byReadingOrder, monthLabel, STATUS_LABEL } from '../lib/api.ts'
import { useClub, useSnapshot } from '../lib/club.tsx'
import { computeBookStats } from '../lib/stats.ts'

export function BookPage() {
  const { id = '' } = useParams()
  const snapshot = useSnapshot()
  const { me, actions } = useClub()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [editingReview, setEditingReview] = useState(false)

  const { books, members, reviews, reactions, progress } = snapshot
  const book = books.find((b) => b.id === id)

  const ordered = useMemo(() => [...books].sort(byReadingOrder), [books])
  const stats = useMemo(() => (book ? computeBookStats(book.id, reviews) : null), [book, reviews])

  if (!book || !stats) {
    return (
      <EmptyState icon="🕵️" title="We have not read that one">
        <Link to="/books" className="link">
          Back to the shelf
        </Link>
      </EmptyState>
    )
  }

  const index = ordered.findIndex((b) => b.id === book.id)
  const previous = ordered[index - 1]
  const next = ordered[index + 1]

  const bookReviews = reviews
    .filter((r) => r.bookId === book.id)
    .sort((a, b) => b.rating - a.rating)
  const myReview = me ? bookReviews.find((r) => r.memberId === me.id) : undefined
  const readers = progress.filter((p) => p.bookId === book.id)
  const bookReactions = reactions.filter((r) => bookReviews.some((rev) => rev.id === r.reviewId))
  const reviewers = bookReviews.map((r) => r.memberId)
  const notReviewed = members.filter((m) => !reviewers.includes(m.id))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/books" className="text-sm text-muted transition hover:text-amber">
          ← The shelf
        </Link>
        {me && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setEditing(true)}>
              Edit book
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-rose"
              onClick={async () => {
                if (!confirm(`Remove ${book.title} and all of its reviews?`)) return
                await actions.removeBook(book.id)
                navigate('/books')
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <section className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="mx-auto w-40 shrink-0 overflow-hidden rounded-xl border border-line shadow-lift sm:w-52 lg:mx-0">
          <div className="aspect-2/3">
            <Cover title={book.title} author={book.author} coverUrl={book.coverUrl} />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={book.status === 'current' ? 'amber' : book.status === 'upcoming' ? 'sky' : 'default'}>
              {STATUS_LABEL[book.status]}
            </Chip>
            <Chip>{monthLabel(book.month, book.year)}</Chip>
            {book.genre && <Chip>{book.genre}</Chip>}
            {book.pageCount && <Chip>{book.pageCount} pages</Chip>}
            {readers.length > 2 && <Chip tone="sage">{readers.length} reading</Chip>}
          </div>

          <h1 className="mt-3 font-display text-4xl leading-tight text-balance">{book.title}</h1>
          <p className="mt-1 text-lg text-muted">{book.author}</p>

          {book.pickerId && (
            <p className="mt-3 flex items-center gap-2 text-xs text-faint">
              picked by
              <MemberPill member={members.find((m) => m.id === book.pickerId)} size={22} />
            </p>
          )}

          {book.description && (
            <p className="mt-4 max-w-prose leading-relaxed text-ink/80">{book.description}</p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="card p-3">
                <p className="text-[10px] tracking-wide text-faint uppercase">Club average</p>
                <p className="stat-num mt-1 text-amber">
                  {stats.average === null ? '—' : stats.average.toFixed(2)}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-[10px] tracking-wide text-faint uppercase">Median</p>
                <p className="stat-num mt-1">{stats.median ?? '—'}</p>
              </div>
              <div className="card p-3">
                <p className="text-[10px] tracking-wide text-faint uppercase">Spread</p>
                <p className="stat-num mt-1 text-rose">
                  {stats.spread === null ? '—' : stats.spread.toFixed(2)}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-[10px] tracking-wide text-faint uppercase">Reactions</p>
                <p className="stat-num mt-1">{bookReactions.length}</p>
              </div>
            </div>

            <div className="card p-4">
              <p className="mb-1 text-xs font-semibold tracking-wide text-faint uppercase">
                How we scored it
              </p>
              <RatingDistribution
                distribution={stats.distribution}
                count={stats.count}
                spread={stats.spread}
                height={150}
                showAverage={false}
              />
            </div>
          </div>
        </div>
      </section>

      {me && (
        <section>
          <SectionHeading
            title={myReview ? 'Your review' : 'Add your review'}
            subtitle="Half stars allowed. Honesty encouraged."
          />
          {editingReview || !myReview ? (
            <ReviewEditor
              book={book}
              existing={myReview}
              onDone={() => setEditingReview(false)}
            />
          ) : (
            <ReviewCard
              review={myReview}
              member={me}
              reactions={reactions}
              onEdit={() => setEditingReview(true)}
            />
          )}
        </section>
      )}

      <section>
        <SectionHeading
          title={`What the club said`}
          subtitle={
            bookReviews.length
              ? `${bookReviews.length} of ${members.length} members have rated it.`
              : 'No ratings yet.'
          }
        />
        <div className="flex flex-col gap-3">
          {bookReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              member={members.find((m) => m.id === review.memberId)}
              reactions={reactions}
            />
          ))}
        </div>

        {notReviewed.length > 0 && (
          <div className="card mt-4 p-4">
            <p className="text-xs font-semibold tracking-wide text-faint uppercase">
              Still to weigh in
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {notReviewed.map((member) => (
                <span key={member.id} className="flex items-center gap-2 text-sm text-muted">
                  <Avatar member={member} size={24} />
                  {member.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <nav className="flex items-center justify-between gap-4 border-t border-line pt-6 text-sm">
        {previous ? (
          <Link to={`/books/${previous.id}`} className="group flex items-center gap-3 text-muted transition hover:text-ink">
            <span className="text-faint">←</span>
            <span>
              <span className="block text-[10px] tracking-wide text-faint uppercase">Previous</span>
              {previous.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/books/${next.id}`} className="group flex items-center gap-3 text-right text-muted transition hover:text-ink">
            <span>
              <span className="block text-[10px] tracking-wide text-faint uppercase">Next</span>
              {next.title}
            </span>
            <span className="text-faint">→</span>
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-3 text-xs text-faint">
        <Stars value={stats.average} size={14} />
        <span>{stats.count} ratings · updated automatically</span>
      </div>

      <BookFormModal open={editing} onClose={() => setEditing(false)} book={book} />
    </div>
  )
}
