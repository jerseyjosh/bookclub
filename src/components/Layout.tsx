import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useClub } from '../lib/club.tsx'
import { IdentityButton } from './Identity.tsx'
import { ToastViewport } from './ui.tsx'

const NAV = [
  { to: '/', label: 'Clubhouse', end: true },
  { to: '/books', label: 'The shelf' },
  { to: '/members', label: 'Members' },
  { to: '/vote', label: 'What’s next' },
]

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

export function Layout() {
  const { snapshot, loading, error, me } = useClub()
  const { pathname } = useLocation()

  const nominations = snapshot?.nominations.length ?? 0
  const topVotes = snapshot
    ? Math.max(0, ...snapshot.nominations.map((n) => n.voterIds.length))
    : 0
  const hasVoted =
    snapshot && me ? snapshot.nominations.some((n) => n.voterIds.includes(me.id)) : false
  const nudge = nominations > 0 && !hasVoted

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />

      <header className="sticky top-0 z-[60] border-b border-line/70 bg-void/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              📚
            </span>
            <span className="font-display text-lg leading-none">
              {snapshot?.club.name ?? 'The Book Club'}
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative rounded-full px-3 py-1.5 text-sm transition ${
                    isActive ? 'bg-raised text-ink' : 'text-muted hover:bg-raised/60 hover:text-ink'
                  }`
                }
              >
                {item.label}
                {item.to === '/vote' && nudge && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber" />
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {topVotes > 0 && pathname !== '/vote' && (
              <span className="chip hidden sm:inline-flex">🗳 {topVotes} votes in</span>
            )}
            <IdentityButton />
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-t border-line/50 px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
                  isActive ? 'bg-raised text-ink' : 'text-muted'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {error && (
          <div className="card mb-6 border-rose/40 bg-rose/10 p-4 text-sm text-rose">
            {error}
            <p className="mt-1 text-xs text-rose/80">
              Is the API running? Try <code>npm run dev</code>.
            </p>
          </div>
        )}
        {!snapshot ? (
          loading ? (
            <div className="flex items-center gap-3 p-10 text-sm text-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-amber" />
              Opening the club…
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-2 p-10 text-center">
              <span className="text-3xl" aria-hidden>
                🔌
              </span>
              <p className="font-display text-xl">Cannot reach the club</p>
              <p className="max-w-md text-sm text-muted">
                The API is not answering. Start it with <code>npm run dev</code>, or check that
                the server is running on the same host as this page.
              </p>
            </div>
          )
        ) : (
          <Outlet />
        )}
      </main>

      <footer className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-faint">
          <p>
            {snapshot?.club.name} · {snapshot?.club.tagline}
          </p>
          <p>
            Self-hosted, one SQLite file. {snapshot?.members.length ?? 0} members ·{' '}
            {snapshot?.books.length ?? 0} books · {snapshot?.reviews.length ?? 0} reviews
          </p>
        </div>
      </footer>

      <ToastViewport />
    </div>
  )
}
