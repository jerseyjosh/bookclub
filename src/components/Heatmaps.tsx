import type { Book, Member, Review } from '../lib/api.ts'
import { MONTHS_SHORT, byReadingOrder, ratingLabel } from '../lib/api.ts'
import { computeBookStats, correlationColor, ratingColor, tasteMatrix } from '../lib/stats.ts'
import { Avatar } from './ui.tsx'

/* ------------------------------------------------------------------ *
 * Who rated what — members × books heatmap
 * ------------------------------------------------------------------ */

export function MemberBookHeatmap({
  books,
  members,
  reviews,
}: {
  books: Book[]
  members: Member[]
  reviews: Review[]
}) {
  const ordered = [...books].sort(byReadingOrder)
  const lookup = new Map(reviews.map((r) => [`${r.memberId}:${r.bookId}`, r.rating]))

  if (!ordered.length || !members.length) return null

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header: tiny covers */}
        <div
          className="grid items-end gap-1.5"
          style={{ gridTemplateColumns: `132px repeat(${ordered.length}, 42px)` }}
        >
          <div />
          {ordered.map((book) => (
            <div key={book.id} className="flex flex-col items-center gap-1">
              <div
                className="h-14 w-9 overflow-hidden border border-line/70 bg-raised"
                title={`${book.title} — ${book.author}`}
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-high to-void" />
                )}
              </div>
              <span className="text-[9px] tracking-wide text-faint uppercase">
                {MONTHS_SHORT[book.month - 1]}
              </span>
            </div>
          ))}
        </div>

        {/* Rows */}
        {members.map((member) => {
          const mine = reviews.filter((r) => r.memberId === member.id)
          const avg =
            mine.length > 0
              ? mine.reduce((acc, r) => acc + r.rating, 0) / mine.length
              : null
          return (
            <div
              key={member.id}
              className="grid items-center gap-1.5"
              style={{ gridTemplateColumns: `132px repeat(${ordered.length}, 42px)` }}
            >
              <div className="flex items-center gap-2 py-1 pr-2">
                <Avatar member={member} size={22} />
                <span className="truncate text-xs text-muted">{member.name}</span>
                <span className="ml-auto font-display text-xs text-faint">
                  {avg === null ? '—' : avg.toFixed(1)}
                </span>
              </div>
              {ordered.map((book) => {
                const rating = lookup.get(`${member.id}:${book.id}`)
                return (
                  <div
                    key={book.id}
                    title={
                      rating === undefined
                        ? `${member.name} hasn’t rated ${book.title}`
                        : `${member.name} gave ${book.title} ${ratingLabel(rating)}★`
                    }
                    className="flex h-9 items-center justify-center border border-line/40 text-[11px] font-medium transition hover:scale-105"
                    style={{
                      background: ratingColor(rating ?? null),
                      color:
                        rating === undefined
                          ? '#4a4a4a'
                          : rating >= 3
                            ? '#0a0a0a'
                            : '#f4f4f4',
                    }}
                  >
                    {rating === undefined ? '·' : ratingLabel(rating)}
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Column averages */}
        <div
          className="mt-1 grid items-center gap-1.5 border-t border-line pt-2"
          style={{ gridTemplateColumns: `132px repeat(${ordered.length}, 42px)` }}
        >
          <div className="pr-2 text-right text-[10px] tracking-wide text-faint uppercase">
            Club avg
          </div>
          {ordered.map((book) => {
            const stats = computeBookStats(book.id, reviews)
            return (
              <div key={book.id} className="text-center font-display text-xs text-ink">
                {stats.average === null ? '—' : stats.average.toFixed(1)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function RatingLegend() {
  const steps = [0.5, 1.5, 2.5, 3.5, 4.5, 5]
  return (
    <div className="flex items-center gap-2 text-xs text-faint">
      <span>Harsh</span>
      <div className="flex overflow-hidden border border-line">
        {steps.map((step) => (
          <span
            key={step}
            className="h-3 w-6"
            style={{ background: ratingColor(step) }}
            title={`${step} stars`}
          />
        ))}
      </div>
      <span>Enthusiastic</span>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Taste match — correlation between members
 * ------------------------------------------------------------------ */

export function TasteMatrix({
  members,
  reviews,
}: {
  members: Member[]
  reviews: Review[]
}) {
  const matrix = tasteMatrix(members, reviews)

  if (members.length < 2) {
    return (
      <p className="text-sm text-muted">
        Add a second member and we can start measuring whose taste matches whose.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `120px repeat(${members.length}, 56px)` }}
        >
          <div />
          {members.map((member) => (
            <div key={member.id} className="flex flex-col items-center gap-1 pb-1">
              <Avatar member={member} size={26} />
              <span className="text-[10px] text-faint">{member.name.slice(0, 7)}</span>
            </div>
          ))}

          {members.map((row, i) => (
            <div key={row.id} className="col-span-full grid gap-1" style={{ gridTemplateColumns: `120px repeat(${members.length}, 56px)` }}>
              <div className="flex items-center gap-2 pr-2">
                <Avatar member={row} size={22} />
                <span className="truncate text-xs text-muted">{row.name}</span>
              </div>
              {members.map((col, j) => {
                if (i === j) {
                  return (
                    <div
                      key={col.id}
                      className="flex h-12 items-center justify-center border border-line/60 bg-raised/60 text-[10px] text-faint"
                    >
                      self
                    </div>
                  )
                }
                const entry = matrix[i]?.[j]
                const value = entry?.value ?? null
                if (value === null) {
                  return (
                    <div
                      key={col.id}
                      className="flex h-12 items-center justify-center border border-line/40 text-[10px] text-faint"
                      title={`Not enough shared books yet (${entry?.shared ?? 0})`}
                    >
                      —
                    </div>
                  )
                }
                const pct = Math.round(value * 100)
                return (
                  <div
                    key={col.id}
                    title={`${row.name} and ${col.name}: ${pct}% taste match over ${entry?.shared ?? 0} shared books`}
                    className="flex h-12 flex-col items-center justify-center border border-line/40 transition hover:scale-105"
                    style={{
                      background: correlationColor(value),
                      color: value > 0.25 ? '#0a0a0a' : '#f4f4f4',
                    }}
                  >
                    <span className="font-display text-sm">{pct}</span>
                    <span className="text-[9px] opacity-70">{entry?.shared ?? 0} bks</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CorrelationLegend() {
  const steps = [-1, -0.5, 0, 0.5, 1]
  return (
    <div className="flex items-center gap-2 text-xs text-faint">
      <span>Opposites</span>
      <div className="flex overflow-hidden border border-line">
        {steps.map((step) => (
          <span
            key={step}
            className="h-3 w-6"
            style={{ background: correlationColor(step) }}
            title={`${Math.round(step * 100)}%`}
          />
        ))}
      </div>
      <span>Identical taste</span>
    </div>
  )
}
