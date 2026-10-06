import { Link, useParams } from 'react-router-dom'
import { ReviewCard } from '../components/Reviews.tsx'
import { MemberScatter, RatingDistribution } from '../components/charts.tsx'
import { CorrelationLegend, TasteMatrix } from '../components/Heatmaps.tsx'
import { Avatar, Chip, EmptyState, SectionHeading, Stars } from '../components/ui.tsx'
import { useSnapshot } from '../lib/club.tsx'
import { clubAverage, computeMemberStats, correlation } from '../lib/stats.ts'

export function MemberPage() {
  const { id = '' } = useParams()
  const snapshot = useSnapshot()
  const { books, members, reviews, reactions } = snapshot

  const member = members.find((m) => m.id === id)
  if (!member) {
    return (
      <EmptyState title="No such member">
        <Link to="/members" className="link">
          Back to the members
        </Link>
      </EmptyState>
    )
  }

  const stats = computeMemberStats(member.id, reviews, books)
  const myReviews = reviews
    .filter((r) => r.memberId === member.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const base = clubAverage(reviews)

  const neighbours = members
    .filter((m) => m.id !== member.id)
    .map((m) => ({ member: m, result: correlation(member.id, m.id, reviews) }))
    .filter((entry) => entry.result !== null)
    .sort((a, b) => (b.result?.value ?? 0) - (a.result?.value ?? 0))

  const bestBook = [...books]
    .map((book) => ({ book, review: reviews.find((r) => r.bookId === book.id && r.memberId === member.id) }))
    .filter((entry) => entry.review)
    .sort((a, b) => (b.review?.rating ?? 0) - (a.review?.rating ?? 0))[0]

  const worstBook = [...books]
    .map((book) => ({ book, review: reviews.find((r) => r.bookId === book.id && r.memberId === member.id) }))
    .filter((entry) => entry.review)
    .sort((a, b) => (a.review?.rating ?? 0) - (b.review?.rating ?? 0))[0]

  return (
    <div className="flex flex-col gap-8">
      <Link to="/members" className="text-sm text-muted transition hover:text-ink">
        ← All members
      </Link>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar member={member} size={64} />
            <div>
              <h1 className="font-display text-3xl">{member.name}</h1>
              <p className="text-sm text-faint">
                Joined {new Date(member.joinedAt).toLocaleDateString()} · {stats.count}{' '}
                {stats.count === 1 ? 'review' : 'reviews'}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="font-display text-4xl text-ink">
                {stats.average === null ? '—' : stats.average.toFixed(2)}
              </p>
              <Stars value={stats.average} size={14} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {stats.favoriteGenre && <Chip tone="sage">{stats.favoriteGenre}</Chip>}
            {stats.generosity !== null && (
              <Chip tone={stats.generosity >= 0 ? 'sage' : 'default'}>
                {stats.generosity >= 0 ? '+' : ''}
                {stats.generosity.toFixed(2)} vs the club
                {base !== null && ` (${base.toFixed(2)})`}
              </Chip>
            )}
            {stats.spread !== null && (
              <Chip>{stats.spread.toFixed(2)} star spread</Chip>
            )}
            {bestBook?.review && (
              <Chip>Loved {bestBook.book.title} ({bestBook.review.rating}★)</Chip>
            )}
            {worstBook?.review && worstBook.review.rating <= 3 && (
              <Chip>Hated {worstBook.book.title} ({worstBook.review.rating}★)</Chip>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">
              Rating distribution
            </p>
            <RatingDistribution
              distribution={stats.distribution}
              count={stats.count}
              spread={stats.spread}
              height={170}
              showAverage={false}
            />
          </div>
        </div>

        <aside className="card p-5">
          <SectionHeading title="Taste twins" />
          {neighbours.length === 0 ? (
            <p className="text-sm text-muted">
              Not enough shared books yet to compare {member.name} with anyone.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {neighbours.map((entry) => {
                const pct = Math.round((entry.result?.value ?? 0) * 100)
                return (
                  <li key={entry.member.id}>
                    <Link
                      to={`/members/${entry.member.id}`}
                      className="flex items-center gap-3 p-1 transition hover:bg-raised/60"
                    >
                      <Avatar member={entry.member} size={30} />
                      <span className="min-w-0 flex-1 truncate text-sm">{entry.member.name}</span>
                      <span
                        className={`font-display text-sm ${
                          pct >= 0 ? 'text-ink' : 'text-muted'
                        }`}
                      >
                        {pct}%
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHeading
          title="Ratings over time"
          subtitle={`Every score ${member.name} has given, oldest pick to newest.`}
        />
        <MemberScatter member={member} books={books} reviews={reviews} />
      </section>

      <section>
        <SectionHeading title={`Reviews by ${member.name}`} />
        <div className="flex flex-col gap-3">
          {myReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              member={member}
              book={books.find((b) => b.id === review.bookId)}
              reactions={reactions}
            />
          ))}
          {myReviews.length === 0 && (
            <EmptyState title={`${member.name} has not reviewed anything yet`} />
          )}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHeading title="How everyone compares" />
        <TasteMatrix members={members} reviews={reviews} />
        <div className="mt-4 flex justify-end">
          <CorrelationLegend />
        </div>
      </section>
    </div>
  )
}
