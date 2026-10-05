/**
 * Wire types shared by the API and the web client.
 * Keep this file dependency-free so both sides can import it.
 */

export type BookStatus = 'read' | 'current' | 'upcoming'

export interface Member {
  id: string
  name: string
  emoji: string
  color: string
  joinedAt: string
}

export interface Book {
  id: string
  title: string
  author: string
  coverUrl: string | null
  /** 1-12 */
  month: number
  year: number
  /** Short blurb / why we picked it. */
  description: string | null
  pageCount: number | null
  genre: string | null
  status: BookStatus
  pickerId: string | null
  createdAt: string
}

export interface Review {
  id: string
  bookId: string
  memberId: string
  /** 0.5 - 5 in half-star steps. */
  rating: number
  body: string | null
  spoiler: boolean
  createdAt: string
  updatedAt: string
}

export interface Reaction {
  id: string
  reviewId: string
  memberId: string
  emoji: string
}

export interface Nomination {
  id: string
  title: string
  author: string | null
  note: string | null
  memberId: string
  createdAt: string
  voterIds: string[]
}

export interface Progress {
  bookId: string
  memberId: string
  /** 0 - 100 */
  percent: number
  updatedAt: string
}

export interface ClubInfo {
  name: string
  tagline: string
  passcodeRequired: boolean
}

/** Everything the client needs, in one request. Small club, small payload. */
export interface ClubSnapshot {
  club: ClubInfo
  members: Member[]
  books: Book[]
  reviews: Review[]
  reactions: Reaction[]
  nominations: Nomination[]
  progress: Progress[]
}

export interface BookInput {
  title: string
  author: string
  coverUrl?: string | null
  month: number
  year: number
  description?: string | null
  pageCount?: number | null
  genre?: string | null
  status?: BookStatus
  pickerId?: string | null
}

export interface ReviewInput {
  bookId: string
  memberId: string
  rating: number
  body?: string | null
  spoiler?: boolean
}

export interface NominationInput {
  title: string
  author?: string | null
  note?: string | null
  memberId: string
}
