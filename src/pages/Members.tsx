import { Link } from 'react-router-dom'
import { CorrelationLegend, MemberBookHeatmap, RatingLegend, TasteMatrix } from '../components/Heatmaps.tsx'
import { Avatar, AvatarStack, Chip, SectionHeading, Stars } from '../components/ui.tsx'
import { useSnapshot } from '../lib/club.tsx'
import { computeMemberStats, tasteTwin } from '../lib/stats.ts'

export function Members() {
  const snapshot = useSnapshot()
  const { books, members, reviews } = snapshot

  const rows = members
    .map((member) => ({
      member,
      stats: computeMemberStats(member.id, reviews, books),
      twin: tasteTwin(member.id, members, reviews),
      lastReview: [...reviews]
        .filter((r) => r.memberId === member.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    }))
    .sort((a, b) => b.stats.count - a.stats.count || (b.stats.average ?? 0) - (a.stats.average ?? 0))

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        title="The members"
        subtitle="Seven opinions, one book a month, no consensus in sight."
      />

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-faint uppercase">
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Books</th>
                <th className="px-4 py-3 font-semibold">Average</th>
                <th className="px-4 py-3 font-semibold">Vs club</th>
                <th className="px-4 py-3 font-semibold">Loves</th>
                <th className="px-4 py-3 font-semibold">Taste twin</th>
                <th className="px-4 py-3 font-semibold">Last review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ member, stats, twin, lastReview }) => (
                <tr key={member.id} className="border-b border-line/50 transition last:border-0 hover:bg-raised/40">
                  <td className="px-4 py-3">
                    <Link to={`/members/${member.id}`} className="flex items-center gap-3 transition hover:text-amber">
                      <Avatar member={member} size={32} />
                      <span>{member.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{stats.count}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Stars value={stats.average} size={12} />
                      <span className="font-display text-amber">
                        {stats.average === null ? '—' : stats.average.toFixed(2)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {stats.generosity === null ? (
                      <span className="text-faint">—</span>
                    ) : (
                      <span className={stats.generosity >= 0 ? 'text-sage' : 'text-rose'}>
                        {stats.generosity >= 0 ? '+' : ''}
                        {stats.generosity.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {stats.favoriteGenre ?? <span className="text-faint">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {twin ? (
                      <Link
                        to={`/members/${twin.member.id}`}
                        className="flex items-center gap-2 text-muted transition hover:text-amber"
                        title={`${Math.round(twin.value * 100)}% taste match`}
                      >
                        <Avatar member={twin.member} size={22} />
                        {twin.member.name}
                        <span className="text-xs text-faint">
                          {Math.round(twin.value * 100)}%
                        </span>
                      </Link>
                    ) : (
                      <span className="text-faint">needs more books</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-faint">
                    {lastReview ? new Date(lastReview.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHeading
          title="Who rated what"
          subtitle="Every member against every book, darkest red is harshest, brightest amber is wildest enthusiasm."
        />
        <MemberBookHeatmap books={books} members={members} reviews={reviews} />
        <div className="mt-4 flex justify-end">
          <RatingLegend />
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHeading
          title="Taste match"
          subtitle="How closely two members rate the same books. 100% means you agree on everything."
        />
        <TasteMatrix members={members} reviews={reviews} />
        <div className="mt-4 flex justify-end">
          <CorrelationLegend />
        </div>
      </section>

      <section>
        <SectionHeading title="Everyone" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ member, stats, twin }) => (
            <Link
              key={member.id}
              to={`/members/${member.id}`}
              className="card card-hover flex flex-col gap-3 p-5"
            >
              <div className="flex items-center gap-3">
                <Avatar member={member} size={46} />
                <div>
                  <p className="font-display text-xl">{member.name}</p>
                  <p className="text-xs text-faint">
                    {stats.count} {stats.count === 1 ? 'book' : 'books'} reviewed
                  </p>
                </div>
                <span className="ml-auto font-display text-2xl text-amber">
                  {stats.average === null ? '—' : stats.average.toFixed(2)}
                </span>
              </div>

              <Stars value={stats.average} size={14} />

              <div className="flex flex-wrap items-center gap-2">
                {stats.favoriteGenre && <Chip tone="sage">❤ {stats.favoriteGenre}</Chip>}
                {stats.generosity !== null && Math.abs(stats.generosity) > 0.15 && (
                  <Chip tone={stats.generosity > 0 ? 'amber' : 'rose'}>
                    {stats.generosity > 0 ? 'generous' : 'tough crowd'}
                  </Chip>
                )}
              </div>

              {twin && (
                <div className="mt-auto flex items-center gap-2 border-t border-line pt-3 text-xs text-faint">
                  <AvatarStack members={[member, twin.member]} size={20} />
                  agrees with {twin.member.name} {Math.round(twin.value * 100)}% of the time
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
