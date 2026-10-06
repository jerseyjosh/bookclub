import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReviewCard } from '../components/Reviews.tsx'
import { RatingTrend } from '../components/charts.tsx'
import {
  Avatar,
  AvatarStack,
  Button,
  Chip,
  Cover,
  EmptyState,
  MemberPill,
  ProgressBar,
  RatingBadge,
  SectionHeading,
  Stars,
} from '../components/ui.tsx'
import { BookFormModal } from '../components/BookForm.tsx'
import { IdentityButton } from '../components/Identity.tsx'
import { useClub, useSnapshot } from '../lib/club.tsx'
import { byReadingOrder, monthLabel, relativeTime } from '../lib/api.ts'
import { computeBookStats, computeMemberStats, computeSuperlatives, clubAverage } from '../lib/stats.ts'
import type { Book, Member, Progress } from '../lib/api.ts'

export function Clubhouse() {
  const snapshot = useSnapshot()
  const { me, actions } = useClub()
  const [addingBook, setAddingBook] = useState(false)
  const [showProgress, setShowProgress] = useState(false)

  const { books, members, reviews, reactions, progress, nominations } = snapshot

  const sorted = [...books].sort(byReadingOrder)
  const current =
    sorted.find((b) => b.status === 'current') ??
    sorted.filter((b) => b.status !== 'upcoming').at(-1)

  const currentStats = current ? computeBookStats(current.id, reviews) : null
  const currentProgress = current ? progress.filter((p) => p.bookId === current.id) : []
  const clubProgress = currentProgress.length
    ? Math.round(currentProgress.reduce((acc, p) => acc + p.percent, 0) / currentProgress.length)
    : 0

  const superlatives = computeSuperlatives(books, members, reviews)
  const clubAvg = clubAverage(reviews)
  const latestReviews = [...reviews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const topNominations = [...nominations]
    .sort((a, b) => b.voterIds.length - a.voterIds.length)
    .slice(0, 3)

  const leaderboard = members
    .map((member) => ({ member, stats: computeMemberStats(member.id, reviews, books) }))
    .filter((entry) => entry.stats.count > 0)
    .sort((a, b) => (b.stats.average ?? 0) - (a.stats.average ?? 0))
    .slice(0, 3)

  if (!books.length) {
    return (
      <>
        <EmptyState title="The shelf is empty">
          {me ? (
            <>
              <p className="mb-4">
                Add the first book, then everyone can start rating. Everything else builds itself.
              </p>
              <Button variant="primary" onClick={() => setAddingBook(true)}>
                Add the first book
              </Button>
            </>
          ) : (
            <>
              <p className="mb-4">
                Nobody has joined yet. Pick a name and you can add the first book — send the link
                to the group and the rest will follow.
              </p>
              <div className="flex justify-center">
                <IdentityButton primary label="Join the club" />
              </div>
            </>
          )}
        </EmptyState>
        <BookFormModal open={addingBook} onClose={() => setAddingBook(false)} />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {/* ---------------------------------------------------------- */}
      {/* Currently reading                                          */}
      {/* ---------------------------------------------------------- */}
      {current && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="card animate-rise overflow-hidden">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
              <Link
                to={`/books/${current.id}`}
                className="mx-auto h-56 w-36 shrink-0 overflow-hidden border border-line shadow-lift transition hover:opacity-90 sm:mx-0 sm:h-64 sm:w-44"
              >
                <Cover title={current.title} author={current.author} coverUrl={current.coverUrl} />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="amber">
                    {current.status === 'current' ? '● Reading now' : 'Most recent pick'}
                  </Chip>
                  <Chip>{monthLabel(current.month, current.year)}</Chip>
                  {current.pageCount && <Chip>{current.pageCount} pages</Chip>}
                  {current.genre && <Chip>{current.genre}</Chip>}
                </div>

                <h1 className="mt-3 font-display text-3xl leading-tight text-balance sm:text-4xl">
                  {current.title}
                </h1>
                <p className="mt-1 text-muted">{current.author}</p>
                {current.description && (
                  <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink/80">
                    {current.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {current.pickerId && (
                    <span className="flex items-center gap-2 text-xs text-faint">
                      picked by
                      <MemberPill member={members.find((m) => m.id === current.pickerId)} size={22} />
                    </span>
                  )}
                  {currentStats && currentStats.count > 0 && (
                    <RatingBadge value={currentStats.average} count={currentStats.count} />
                  )}
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-muted">Club progress</span>
                    <span className="text-ink">{clubProgress}%</span>
                  </div>
                  <ProgressBar percent={clubProgress} />
                  <div className="mt-3 flex items-center justify-between">
                    <AvatarStack members={currentProgress.map((p) => members.find((m) => m.id === p.memberId)).filter((m): m is Member => Boolean(m))} />
                    <button
                      onClick={() => setShowProgress((v) => !v)}
                      className="cursor-pointer text-xs text-faint transition hover:text-ink"
                    >
                      {showProgress ? 'Hide' : 'Breakdown'}
                    </button>
                  </div>

                  {showProgress && (
                    <ul className="mt-3 flex flex-col gap-2">
                      {[...currentProgress]
                        .sort((a, b) => b.percent - a.percent)
                        .map((entry) => {
                          const member = members.find((m) => m.id === entry.memberId)
                          return (
                            <li key={entry.memberId} className="flex items-center gap-3">
                              <Avatar member={member} size={22} />
                              <span className="w-16 truncate text-xs text-muted">
                                {member?.name}
                              </span>
                              <ProgressBar
                                percent={entry.percent}
                                className="flex-1"
                              />
                              <span className="w-9 text-right text-xs text-faint">
                                {entry.percent}%
                              </span>
                            </li>
                          )
                        })}
                    </ul>
                  )}

                  {me && (
                    <YourProgress
                      book={current}
                      entry={currentProgress.find((p) => p.memberId === me.id)}
                      onSave={(percent) => void actions.setProgress(current.id, percent)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Next up */}
          <aside className="flex flex-col gap-4">
            <div className="card p-5">
              <SectionHeading title="Shortlist" />
              {topNominations.length === 0 ? (
                <p className="text-sm text-muted">
                  No nominations yet.{' '}
                  <Link to="/vote" className="link">
                    Put something forward
                  </Link>
                  .
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {topNominations.map((nomination, index) => (
                    <li key={nomination.id} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs ${
                          index === 0 ? 'bg-ink text-void' : 'bg-raised text-faint'
                        }`}
                      >
                        {nomination.voterIds.length}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{nomination.title}</p>
                        <p className="truncate text-xs text-faint">
                          {nomination.author ?? 'Unknown author'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/vote" className="btn btn-sm mt-4 w-full">
                Go to the vote
              </Link>
            </div>

            <div className="card p-5">
              <SectionHeading title="At a glance" />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-faint">Books read</dt>
                  <dd className="stat-num">{books.filter((b) => b.status !== 'upcoming').length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Club average</dt>
                  <dd className="stat-num">
                    {clubAvg === null ? '—' : clubAvg.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Reviews</dt>
                  <dd className="stat-num">{reviews.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Members</dt>
                  <dd className="stat-num">{members.length}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </section>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Superlatives                                               */}
      {/* ---------------------------------------------------------- */}
      {superlatives.length > 0 && (
        <section>
          <SectionHeading
            title="Standings"
            subtitle="Recalculated after every review."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {superlatives.map((item) => {
              const body = (
                <>
                  <p className="text-xs font-semibold tracking-wide text-faint uppercase">
                    {item.label}
                  </p>
                  <p className={`mt-2 font-display text-lg leading-tight ${item.accent}`}>
                    {item.headline}
                  </p>
                  <p className="mt-1 text-xs text-muted">{item.detail}</p>
                </>
              )
              return item.to ? (
                <Link key={item.key} to={item.to} className="card card-hover p-4">
                  {body}
                </Link>
              ) : (
                <div key={item.key} className="card p-4">
                  {body}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Trend                                                      */}
      {/* ---------------------------------------------------------- */}
      <section className="card p-5 sm:p-6">
        <SectionHeading
          title="Rating trend"
          subtitle="Every pick, scored out of five."
        />
        <RatingTrend books={books} members={members} reviews={reviews} />
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Reviews + leaderboard                                      */}
      {/* ---------------------------------------------------------- */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <SectionHeading
            title="Recent reviews"
            action={
              <Link to="/books" className="text-sm text-muted transition hover:text-ink">
                All books →
              </Link>
            }
          />
          <div className="flex flex-col gap-3">
            {latestReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                member={members.find((m) => m.id === review.memberId)}
                book={books.find((b) => b.id === review.bookId)}
                reactions={reactions}
              />
            ))}
            {!latestReviews.length && <EmptyState title="No reviews yet" />}
          </div>
        </div>

        <aside>
          <SectionHeading title="Leaderboard" subtitle="Highest average rating." />
          <div className="flex flex-col gap-3">
            {leaderboard.map((entry, index) => (
              <Link
                key={entry.member.id}
                to={`/members/${entry.member.id}`}
                className="card card-hover flex items-center gap-3 p-4"
              >
                <span className="font-display text-2xl text-faint">{index + 1}</span>
                <Avatar member={entry.member} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{entry.member.name}</p>
                  <p className="text-xs text-faint">
                    {entry.stats.count} books ·{' '}
                    <Stars value={entry.stats.average} size={11} />
                  </p>
                </div>
                <span className="font-display text-ink">
                  {entry.stats.average?.toFixed(2) ?? '—'}
                </span>
              </Link>
            ))}
            {!leaderboard.length && (
              <p className="text-sm text-muted">Nobody has rated anything yet.</p>
            )}
          </div>

          {current && currentStats && currentStats.count > 0 && (
            <div className="card mt-4 p-4">
              <p className="text-xs font-semibold tracking-wide text-faint uppercase">
                {current.title}
              </p>
              <p className="mt-1 text-xs text-muted">
                {currentStats.count} reviews in, {relativeTime(reviews[0]?.createdAt ?? '')} for the last one.
              </p>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Your reading progress
 * ------------------------------------------------------------------ */

function YourProgress({
  book,
  entry,
  onSave,
}: {
  book: Book
  entry: Progress | undefined
  onSave: (percent: number) => void
}) {
  const [value, setValue] = useState(entry?.percent ?? 0)

  useEffect(() => {
    setValue(entry?.percent ?? 0)
  }, [entry?.percent, book.id])

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Your progress</span>
        <span className="text-ink">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerUp={() => onSave(value)}
        onKeyUp={() => onSave(value)}
        className="mt-2 w-full cursor-pointer"
        aria-label="Your reading progress"
      />
    </div>
  )
}
