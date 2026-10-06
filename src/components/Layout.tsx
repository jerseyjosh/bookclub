import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useClub } from '../lib/club.tsx'
import { IdentityButton } from './Identity.tsx'
import { Wordmark } from './Medusa.tsx'
import { ToastViewport } from './ui.tsx'

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/books', label: 'Books' },
  { to: '/members', label: 'Members' },
  { to: '/vote', label: 'Shortlist' },
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

  const nominations = snapshot?.nominations.length ?? 0
  const hasVoted =
    snapshot && me ? snapshot.nominations.some((n) => n.voterIds.includes(me.id)) : false
  const nudge = nominations > 0 && !hasVoted

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />

      <header className="sticky top-0 z-[60] border-b border-line bg-void/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
          <Link to="/" aria-label={snapshot?.club.name ?? '3SixBookClub'}>
            <Wordmark />
          </Link>

          <nav className="ml-auto hidden items-center gap-7 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative text-[0.68rem] tracking-[0.18em] uppercase transition ${
                    isActive ? 'text-ink' : 'text-faint hover:text-muted'
                  }`
                }
              >
                {item.label}
                {item.to === '/vote' && nudge && (
                  <span
                    className="absolute -top-1 -right-2 h-1 w-1 rounded-full bg-ink"
                    aria-hidden
                  />
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <IdentityButton />
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex gap-6 overflow-x-auto border-t border-line px-4 py-3 md:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 text-[0.68rem] tracking-[0.18em] uppercase transition ${
                  isActive ? 'text-ink' : 'text-faint'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        {error && (
          <div className="card mb-6 border-rose/40 p-4 text-sm text-rose">
            {error}
            <p className="mt-1 text-xs text-rose/70">
              Is the API running? Try <code>npm run dev</code>.
            </p>
          </div>
        )}
        {!snapshot ? (
          loading ? (
            <div className="flex items-center gap-3 p-10 text-sm text-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" />
              Loading…
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-3 p-14 text-center">
              <p className="font-display text-xl">The club is out of reach</p>
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

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-[0.68rem] tracking-[0.12em] text-faint uppercase">
          <p>{snapshot?.club.name ?? '3SixBookClub'}</p>
          <p>
            {snapshot?.members.length ?? 0} members · {snapshot?.books.length ?? 0} books ·{' '}
            {snapshot?.reviews.length ?? 0} reviews
          </p>
        </div>
      </footer>

      <ToastViewport />
    </div>
  )
}
