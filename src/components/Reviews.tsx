import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Book, Member, Reaction, Review } from '../lib/api.ts'
import { relativeTime, ratingLabel } from '../lib/api.ts'
import { useClub } from '../lib/club.tsx'
import { Avatar, Button, Stars } from './ui.tsx'

const REACTION_EMOJI = ['🔥', '💯', '😂', '😭', '🤯', '👏']

function SpoilerText({ text }: { text: string }) {
  const [shown, setShown] = useState(false)
  if (!shown) {
    return (
      <button
        onClick={() => setShown(true)}
        className="mt-2 cursor-pointer rounded-lg border border-dashed border-line bg-void/40 px-3 py-2 text-left text-xs text-muted transition hover:border-amber/50 hover:text-ink"
      >
        🙈 Contains spoilers — tap to reveal
      </button>
    )
  }
  return <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink/90">{text}</p>
}

export function ReviewCard({
  review,
  member,
  book,
  reactions,
  onEdit,
}: {
  review: Review
  member: Member | undefined
  book?: Book
  reactions: Reaction[]
  onEdit?: () => void
}) {
  const { me, actions } = useClub()
  const [showPicker, setShowPicker] = useState(false)

  const mine = reactions.filter((r) => r.reviewId === review.id)
  const grouped = REACTION_EMOJI.map((emoji) => ({
    emoji,
    count: mine.filter((r) => r.emoji === emoji).length,
    active: mine.some((r) => r.emoji === emoji && r.memberId === me?.id),
  })).filter((entry) => entry.count > 0 || entry.emoji === '🔥')

  const canEdit = me && member && me.id === member.id

  return (
    <article className="card p-4">
      <header className="flex items-center gap-3">
        <Avatar member={member} size={34} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-medium text-ink">{member?.name ?? 'Someone'}</span>
            {book && (
              <>
                <span className="text-faint"> on </span>
                <Link to={`/books/${book.id}`} className="link">
                  {book.title}
                </Link>
              </>
            )}
          </p>
          <p className="text-xs text-faint">{relativeTime(review.createdAt)}</p>
        </div>
        <div className="text-right">
          <Stars value={review.rating} size={14} />
        </div>
      </header>

      {review.body &&
        (review.spoiler ? (
          <SpoilerText text={review.body} />
        ) : (
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink/90">{review.body}</p>
        ))}

      <footer className="mt-3 flex flex-wrap items-center gap-1.5">
        {grouped
          .filter((entry) => entry.count > 0)
          .map((entry) => (
            <button
              key={entry.emoji}
              onClick={() => me && void actions.react(review.id, entry.emoji)}
              disabled={!me}
              className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs transition disabled:cursor-default ${
                entry.active
                  ? 'border-amber/60 bg-amber/15 text-amber'
                  : 'border-line bg-raised/60 text-muted hover:border-amber/40'
              }`}
            >
              {entry.emoji} {entry.count}
            </button>
          ))}

        {showPicker ? (
          <span className="inline-flex items-center gap-1">
            {REACTION_EMOJI.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setShowPicker(false)
                  void actions.react(review.id, emoji)
                }}
                className="cursor-pointer rounded-full px-1.5 py-0.5 text-sm transition hover:bg-raised"
              >
                {emoji}
              </button>
            ))}
          </span>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            disabled={!me}
            className="cursor-pointer rounded-full border border-dashed border-line px-2 py-0.5 text-xs text-faint transition hover:border-amber/40 hover:text-ink disabled:cursor-default"
          >
            + react
          </button>
        )}

        {canEdit && onEdit && (
          <button
            onClick={onEdit}
            className="ml-auto cursor-pointer text-xs text-faint transition hover:text-amber"
          >
            Edit your review
          </button>
        )}
      </footer>
    </article>
  )
}

/* ------------------------------------------------------------------ *
 * Review editor
 * ------------------------------------------------------------------ */

export function ReviewEditor({
  book,
  existing,
  onDone,
}: {
  book: Book
  existing?: Review
  onDone?: () => void
}) {
  const { me, actions } = useClub()
  const [rating, setRating] = useState<number | null>(existing?.rating ?? null)
  const [body, setBody] = useState(existing?.body ?? '')
  const [spoiler, setSpoiler] = useState(existing?.spoiler ?? false)
  const [saving, setSaving] = useState(false)

  if (!me) return null

  const submit = async () => {
    if (rating === null) return
    setSaving(true)
    try {
      await actions.saveReview({ bookId: book.id, rating, body, spoiler })
      onDone?.()
    } catch {
      /* the toast already explains what went wrong */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {existing ? 'Your review' : `What did you think of ${book.title}?`}
        </p>
        <Stars value={rating} onChange={setRating} size={22} showValue />
      </div>

      <textarea
        className="input mt-3 min-h-24 resize-y"
        placeholder="One line or one essay — both welcome."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={5000}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={spoiler}
            onChange={(e) => setSpoiler(e.target.checked)}
            className="h-4 w-4 accent-amber"
          />
          Hide behind a spoiler warning
        </label>

        <div className="ml-auto flex items-center gap-2">
          {existing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void actions.removeReview(existing.id)}
            >
              Delete
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={rating === null || saving}
            onClick={() => void submit()}
          >
            {saving ? 'Saving…' : existing ? 'Update review' : 'Post review'}
          </Button>
        </div>
      </div>

      {rating === null && (
        <p className="mt-2 text-xs text-faint">Pick a rating out of five to post.</p>
      )}
    </div>
  )
}

/** Compact "your rating" strip used on book cards and the current-read hero. */
export function YourRating({
  review,
  onRate,
}: {
  review: Review | undefined
  onRate: (rating: number) => void
}) {
  const { me } = useClub()
  if (!me) return null
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span>You:</span>
      <Stars value={review?.rating ?? null} onChange={onRate} size={16} />
      {review && <span className="text-amber">{ratingLabel(review.rating)}★</span>}
    </div>
  )
}
