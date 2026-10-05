import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { VoteBars } from '../components/charts.tsx'
import {
  Avatar,
  AvatarStack,
  Button,
  Chip,
  Cover,
  EmptyState,
  Field,
  SectionHeading,
} from '../components/ui.tsx'
import { useClub, useSnapshot } from '../lib/club.tsx'
import { byReadingOrder, monthLabel } from '../lib/api.ts'

export function Vote() {
  const snapshot = useSnapshot()
  const { me, actions } = useClub()
  const { books, members, nominations } = snapshot

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const sorted = useMemo(
    () => [...nominations].sort((a, b) => b.voterIds.length - a.voterIds.length),
    [nominations],
  )

  const current = [...books].sort(byReadingOrder).find((b) => b.status === 'current')
  const latest = [...books].sort(byReadingOrder).filter((b) => b.status !== 'upcoming').at(-1)
  const nextSlot = useMemo(() => {
    const anchor = current ?? latest
    if (!anchor) {
      const now = new Date()
      return { month: now.getMonth() + 1, year: now.getFullYear() }
    }
    const month = (anchor.month % 12) + 1
    const year = anchor.month === 12 ? anchor.year + 1 : anchor.year
    return { month, year }
  }, [current, latest])

  const leader = sorted[0]
  const myVoteCount = me ? nominations.filter((n) => n.voterIds.includes(me.id)).length : 0

  const addNomination = async () => {
    if (!title.trim()) return
    setBusy(true)
    try {
      await actions.nominate({ title: title.trim(), author: author.trim(), note: note.trim() })
      setTitle('')
      setAuthor('')
      setNote('')
    } catch {
      /* toast */
    } finally {
      setBusy(false)
    }
  }

  const scheduleLeader = async () => {
    if (!leader) return
    try {
      await actions.addBook({
        title: leader.title,
        author: leader.author ?? '',
        month: nextSlot.month,
        year: nextSlot.year,
        status: 'upcoming',
        description: leader.note,
      })
    } catch {
      /* toast */
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        title="What we read next"
        subtitle={`The shortlist for ${monthLabel(nextSlot.month, nextSlot.year)}. Add an idea, vote for as many as you like.`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {sorted.length === 0 && (
            <EmptyState icon="🗳" title="No nominations yet">
              Be the first to put a book forward. Anything goes — novels, non-fiction, graphic novels,
              the weird one you have been meaning to read.
            </EmptyState>
          )}

          {sorted.map((nomination, index) => {
            const nominator = members.find((m) => m.id === nomination.memberId)
            const voters = nomination.voterIds
              .map((id) => members.find((m) => m.id === id))
              .filter((m): m is NonNullable<typeof m> => Boolean(m))
            const voted = me ? nomination.voterIds.includes(me.id) : false
            const isLeader = index === 0 && nomination.voterIds.length > 0

            return (
              <article
                key={nomination.id}
                className={`card animate-rise flex gap-4 p-4 ${
                  isLeader ? 'border-amber/50 shadow-lift' : ''
                }`}
              >
                <div className="flex w-10 shrink-0 flex-col items-center">
                  <span className="font-display text-3xl text-amber">
                    {nomination.voterIds.length}
                  </span>
                  <span className="text-[10px] tracking-wide text-faint uppercase">
                    {nomination.voterIds.length === 1 ? 'vote' : 'votes'}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {isLeader && <Chip tone="amber">🏆 Leading</Chip>}
                    <h3 className="font-display text-xl">{nomination.title}</h3>
                  </div>
                  {nomination.author && (
                    <p className="text-sm text-muted">{nomination.author}</p>
                  )}
                  {nomination.note && (
                    <p className="mt-2 text-sm leading-relaxed text-ink/80">{nomination.note}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {nominator && (
                      <span className="flex items-center gap-2 text-xs text-faint">
                        <Avatar member={nominator} size={20} />
                        {nominator.name}
                      </span>
                    )}
                    {voters.length > 0 && <AvatarStack members={voters} size={22} max={8} />}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                  <Button
                    variant={voted ? 'primary' : 'default'}
                    size="sm"
                    disabled={!me}
                    onClick={() => void actions.voteNomination(nomination.id)}
                  >
                    {voted ? '✓ Voted' : 'Vote'}
                  </Button>
                  {me?.id === nomination.memberId && (
                    <button
                      onClick={() => void actions.removeNomination(nomination.id)}
                      className="cursor-pointer text-xs text-faint transition hover:text-rose"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <aside className="flex flex-col gap-4">
          {leader && (
            <div className="card border-amber/40 p-5">
              <p className="text-xs font-semibold tracking-wide text-faint uppercase">
                Currently winning
              </p>
              <p className="mt-2 font-display text-2xl">{leader.title}</p>
              <p className="text-sm text-muted">{leader.author}</p>
              <p className="mt-2 text-xs text-faint">
                {leader.voterIds.length} of {members.length} members have voted for it.
              </p>
              {me && (
                <Button
                  className="mt-4 w-full"
                  size="sm"
                  onClick={() => void scheduleLeader()}
                >
                  Schedule for {monthLabel(nextSlot.month, nextSlot.year, true)}
                </Button>
              )}
            </div>
          )}

          <div className="card p-5">
            <p className="text-xs font-semibold tracking-wide text-faint uppercase">
              Vote totals
            </p>
            <div className="mt-3">
              <VoteBars nominations={nominations} members={members} />
            </div>
          </div>

          <div className="card p-5">
            <p className="text-xs font-semibold tracking-wide text-faint uppercase">
              How voting works
            </p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <li>· Vote for as many books as you like, and take your vote back any time.</li>
              <li>· Nominating something counts as a vote for it.</li>
              <li>· {me ? `You have voted for ${myVoteCount} of ${nominations.length}.` : 'Join the club to vote.'}</li>
            </ul>
          </div>

          {current && (
            <div className="card flex items-center gap-3 p-4">
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded border border-line">
                <Cover title={current.title} coverUrl={current.coverUrl} compact />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] tracking-wide text-faint uppercase">Now reading</p>
                <Link to={`/books/${current.id}`} className="link block truncate text-sm">
                  {current.title}
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>

      <section className="card p-5 sm:p-6">
        <SectionHeading
          title="Put a book forward"
          subtitle="Anything you would genuinely read. One nomination each is plenty, but we will not stop you."
        />
        {me ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Book title"
              />
            </Field>
            <Field label="Author">
              <input
                className="input"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Why should we read it?">
                <textarea
                  className="input min-h-20 resize-y"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Make your case."
                />
              </Field>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button
                variant="primary"
                disabled={!title.trim() || busy}
                onClick={() => void addNomination()}
              >
                {busy ? 'Adding…' : 'Nominate'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Join the club (top right) to nominate and vote.
          </p>
        )}
      </section>
    </div>
  )
}
