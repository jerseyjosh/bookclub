import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getSnapshot, request, type Book, type ClubSnapshot, type Member } from './api.ts'

const STORAGE_KEY = 'bookclub.memberId'

export interface BookDraft {
  title: string
  author: string
  coverUrl?: string | null
  month: number
  year: number
  description?: string | null
  pageCount?: number | null
  genre?: string | null
  status?: 'read' | 'current' | 'upcoming'
  pickerId?: string | null
}

export interface ReviewDraft {
  bookId: string
  rating: number
  body?: string | null
  spoiler?: boolean
}

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'error'
}

interface ClubContextValue {
  snapshot: ClubSnapshot | null
  loading: boolean
  error: string | null
  me: Member | null
  setMe: (id: string | null) => void
  refresh: () => Promise<void>
  toasts: Toast[]
  dismissToast: (id: number) => void
  notify: (message: string, tone?: 'info' | 'error') => void
  actions: {
    join: (name: string, emoji: string, passcode?: string) => Promise<Member>
    updateProfile: (patch: { name?: string; emoji?: string; color?: string }) => Promise<void>
    leave: () => Promise<void>
    addBook: (draft: BookDraft) => Promise<Book>
    updateBook: (id: string, patch: Partial<BookDraft>) => Promise<void>
    removeBook: (id: string) => Promise<void>
    saveReview: (draft: ReviewDraft) => Promise<void>
    removeReview: (id: string) => Promise<void>
    react: (reviewId: string, emoji: string) => Promise<void>
    nominate: (draft: { title: string; author?: string; note?: string }) => Promise<void>
    voteNomination: (id: string) => Promise<void>
    removeNomination: (id: string) => Promise<void>
    setProgress: (bookId: string, percent: number) => Promise<void>
  }
}

const ClubContext = createContext<ClubContextValue | null>(null)

export function ClubProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ClubSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [memberId, setMemberId] = useState<string | null>(() =>
    typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY),
  )
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, tone: 'info' | 'error' = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await getSnapshot()
      setSnapshot(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the club')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const me = useMemo(() => {
    if (!snapshot || !memberId) return null
    return snapshot.members.find((m) => m.id === memberId) ?? null
  }, [snapshot, memberId])

  // Forget a stale identity if the member was deleted.
  useEffect(() => {
    if (snapshot && memberId && !snapshot.members.some((m) => m.id === memberId)) {
      setMemberId(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [snapshot, memberId])

  const setMe = useCallback((id: string | null) => {
    setMemberId(id)
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const run = useCallback(
    async (fn: () => Promise<unknown>, successMessage?: string) => {
      try {
        await fn()
        await refresh()
        if (successMessage) notify(successMessage)
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Something went wrong', 'error')
        throw err
      }
    },
    [refresh, notify],
  )

  const actions = useMemo<ClubContextValue['actions']>(
    () => ({
      join: async (name, emoji, passcode) => {
        const member = await request<Member>('/members', {
          method: 'POST',
          body: { name, emoji, passcode },
        })
        setMe(member.id)
        await refresh()
        notify(`Welcome to the club, ${member.name}.`)
        return member
      },
      updateProfile: (patch) =>
        run(() =>
          request(`/members/${memberId}`, { method: 'PATCH', body: patch, memberId }),
        ),
      leave: async () => {
        await run(() => request(`/members/${memberId}`, { method: 'DELETE', memberId }))
        setMe(null)
      },
      addBook: async (draft) => {
        const book = await request<Book>('/books', {
          method: 'POST',
          body: { ...draft, pickerId: draft.pickerId ?? memberId },
          memberId,
        })
        await refresh()
        notify(`Added ${book.title} to the shelf.`)
        return book
      },
      updateBook: (id, patch) =>
        run(() => request(`/books/${id}`, { method: 'PATCH', body: patch, memberId })),
      removeBook: (id) => run(() => request(`/books/${id}`, { method: 'DELETE', memberId })),
      saveReview: (draft) =>
        run(
          () =>
            request('/reviews', {
              method: 'PUT',
              body: { ...draft, memberId },
              memberId,
            }),
          'Review saved.',
        ),
      removeReview: (id) => run(() => request(`/reviews/${id}`, { method: 'DELETE', memberId })),
      react: (reviewId, emoji) =>
        run(() => request('/reactions/toggle', { method: 'POST', body: { reviewId, emoji }, memberId })),
      nominate: (draft) =>
        run(
          () => request('/nominations', { method: 'POST', body: draft, memberId }),
          'Nomination added.',
        ),
      voteNomination: (id) =>
        run(() => request(`/nominations/${id}/vote`, { method: 'POST', memberId })),
      removeNomination: (id) =>
        run(() => request(`/nominations/${id}`, { method: 'DELETE', memberId })),
      setProgress: (bookId, percent) =>
        run(() => request('/progress', { method: 'PUT', body: { bookId, percent }, memberId })),
    }),
    [memberId, refresh, notify, run, setMe],
  )

  const value = useMemo<ClubContextValue>(
    () => ({
      snapshot,
      loading,
      error,
      me,
      setMe,
      refresh,
      toasts,
      dismissToast,
      notify,
      actions,
    }),
    [snapshot, loading, error, me, setMe, refresh, toasts, dismissToast, notify, actions],
  )

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>
}

export function useClub(): ClubContextValue {
  const ctx = useContext(ClubContext)
  if (!ctx) throw new Error('useClub must be used inside <ClubProvider>')
  return ctx
}

/** Convenience: the snapshot, guaranteed non-null (pages render behind a loader). */
export function useSnapshot(): ClubSnapshot {
  const { snapshot } = useClub()
  if (!snapshot) throw new Error('Snapshot not ready')
  return snapshot
}
