import { db, nowIso } from './db.ts'
import {
  createMember,
  createNomination,
  isSeeded,
  setProgress,
  toggleNominationVote,
  upsertReview,
} from './store.ts'

/**
 * Loads a demo club so the site isn't empty on first boot.
 * Run `npm run reset` to wipe it and `npm run seed` to load it again.
 */

interface SeedBook {
  title: string
  author: string
  cover: string
  genre: string
  pages: number
  description: string
  /** Rating per member, in the same order as SEED_MEMBERS. null = didn't review. */
  ratings: (number | null)[]
}

const SEED_MEMBERS = [
  { name: 'Maya', emoji: '📚', color: '#e0a458' },
  { name: 'Jonas', emoji: '🦉', color: '#6c8ed9' },
  { name: 'Priya', emoji: '🌙', color: '#b98bd9' },
  { name: 'Theo', emoji: '🎧', color: '#5fb3b3' },
  { name: 'Lena', emoji: '🌿', color: '#7fb069' },
  { name: 'Sam', emoji: '🍕', color: '#d96c6c' },
  { name: 'Nadia', emoji: '🔭', color: '#e08fbf' },
]

const cover = (id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`

/** Oldest first. The last one is the current month, the rest are history. */
const SEED_BOOKS: SeedBook[] = [
  {
    title: 'Piranesi',
    author: 'Susanna Clarke',
    cover: cover(10226290),
    genre: 'Fantasy',
    pages: 272,
    description:
      'A man lives alone in an infinite house filled with tides, statues and a sky. We spent most of the meeting arguing about the statues.',
    ratings: [5, 4, 4, 4.5, 4.5, 4, 5],
  },
  {
    title: 'The Midnight Library',
    author: 'Matt Haig',
    cover: cover(10313767),
    genre: 'Fiction',
    pages: 304,
    description:
      'Between life and death there is a library, and every book is a life you could have lived. The most argued-about pick of the year.',
    ratings: [4, 2.5, 3.5, 3, 3, 4.5, 4],
  },
  {
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    cover: cover(11200092),
    genre: 'Science Fiction',
    pages: 496,
    description:
      'A lone astronaut wakes up with amnesia and a dying sun to fix. Rocky for president.',
    ratings: [4.5, 4, 5, 5, 4, 5, 5],
  },
  {
    title: 'Klara and the Sun',
    author: 'Kazuo Ishiguro',
    cover: cover(10648686),
    genre: 'Literary Fiction',
    pages: 334,
    description:
      'An artificial friend watches the world from a shop window. Quiet, eerie, and we could not agree on the ending.',
    ratings: [4.5, 3, 3.5, 3.5, 4, 4, 3.5],
  },
  {
    title: 'The Seven Husbands of Evelyn Hugo',
    author: 'Taylor Jenkins Reid',
    cover: cover(8354226),
    genre: 'Historical Fiction',
    pages: 400,
    description:
      'A reclusive Hollywood icon finally tells the truth about her seven marriages. Snacks were themed. No regrets.',
    ratings: [4, 3.5, 4.5, 4.5, 3.5, 5, 4],
  },
  {
    title: 'Babel',
    author: 'R. F. Kuang',
    cover: cover(12468631),
    genre: 'Fantasy',
    pages: 577,
    description:
      'Translation as magic, empire as the villain, Oxford as the crime scene. 577 pages and Jonas still wanted more footnotes.',
    ratings: [5, 3.5, 3.5, 4, 4.5, 4.5, 3.5],
  },
  {
    title: 'Tomorrow, and Tomorrow, and Tomorrow',
    author: 'Gabrielle Zevin',
    cover: cover(12859975),
    genre: 'Literary Fiction',
    pages: 460,
    description:
      'Two friends build video games and fail, beautifully, at knowing each other. The one that made two of us cry on the train.',
    ratings: [4.5, 4, 4, 5, 4, 4.5, 4.5],
  },
  {
    title: 'The Wager',
    author: 'David Grann',
    cover: cover(13245246),
    genre: 'Non-fiction',
    pages: 432,
    description:
      'A shipwreck, a mutiny and competing versions of the truth in 1741. Our first non-fiction pick and it went down extremely well.',
    ratings: [4, 3, 4.5, 4.5, 3.5, 4.5, 4.5],
  },
  {
    title: 'Station Eleven',
    author: 'Emily St. John Mandel',
    cover: cover(7369961),
    genre: 'Science Fiction',
    pages: 352,
    description:
      'A flu wipes out civilisation; a travelling symphony keeps playing Shakespeare. Weirdly hopeful.',
    ratings: [4.5, 3, 4, 3.5, 4.5, 3.5, 4],
  },
  {
    title: 'The Bee Sting',
    author: 'Paul Murray',
    cover: cover(14406691),
    genre: 'Literary Fiction',
    pages: 645,
    description:
      'A family in financial freefall, told four ways. Currently in progress — 645 pages, we are all behind.',
    ratings: [],
  },
]

/** Short reviews, keyed by "bookTitle|memberName". */
const SEED_REVIEWS: Record<string, string> = {
  'Piranesi|Maya':
    'I would move into the House tomorrow. The least lonely book about being completely alone that I have ever read.',
  'Piranesi|Jonas': 'Gorgeous. Slightly too pleased with its own mystery for me.',
  'Piranesi|Lena': 'The atmosphere does all the work and I was happy to let it.',
  'Piranesi|Nadia':
    'Read it twice. The second time every statue description made sense and I gasped out loud on a bus.',
  'The Midnight Library|Sam': 'Exactly the warm hug I needed in February. I do not care that it is a bit on the nose.',
  'The Midnight Library|Jonas': 'A lovely idea wrapped in a fortune cookie. Two and a half stars and I stand by it.',
  'The Midnight Library|Lena':
    'Every chapter explained its own metaphor to me twice. I wanted to like it more than I did.',
  'The Midnight Library|Nadia': 'Cried anyway. No further comment.',
  'Project Hail Mary|Priya': 'Science! Friendship! Problem solving as plot! This is the whole reason I read sci-fi.',
  'Project Hail Mary|Theo':
    'I listened to the audiobook and the way Rocky is voiced is a genuine achievement. Five stars for Rocky alone.',
  'Project Hail Mary|Jonas': 'Irresistible. Even the constant arithmetic worked on me.',
  'Project Hail Mary|Maya':
    'The most fun we have had all year. I finished at 2am and immediately wanted to start again.',
  'Klara and the Sun|Maya':
    'Ishiguro writes loneliness like nobody else. The sun stuff is a bit of a shrug, but I forgave it.',
  'Klara and the Sun|Lena':
    'Beautiful sentences, and I found the last thirty pages genuinely upsetting in a way I am still thinking about.',
  'Klara and the Sun|Theo': 'I admired it more than I enjoyed it. Is Klara reliable? Is anyone?',
  'The Seven Husbands of Evelyn Hugo|Sam':
    'The most fun meeting we have had. We made a cocktail for every husband. Husband #4 was the best drink.',
  'The Seven Husbands of Evelyn Hugo|Priya':
    'Unputdownable. I read it in two sittings and then immediately gave it to my sister.',
  'The Seven Husbands of Evelyn Hugo|Jonas': 'Total candy and I enjoyed it more than I want to admit.',
  'The Seven Husbands of Evelyn Hugo|Lena': 'It is doing exactly what it promises, and it does it very well.',
  'Babel|Nadia':
    'The footnotes are half the book and they are the good half. Devastating final act.',
  'Babel|Maya': 'A thesis with a plot attached, and the plot won me over by the end.',
  'Babel|Jonas':
    'Brilliant ideas, but it explains them to you at length. Trim 150 pages and it is a masterpiece.',
  'Babel|Sam': 'I loved the magic system so much I started a notebook about it. Nobody asked me to.',
  'Tomorrow, and Tomorrow, and Tomorrow|Theo':
    'Anyone who has made anything with a friend should read this. I cried on the Northern line. SPOILER: I am still not over the ending.',
  'Tomorrow, and Tomorrow, and Tomorrow|Lena':
    'It genuinely understands creative partnership. The 1990s game design details are perfect.',
  'Tomorrow, and Tomorrow, and Tomorrow|Priya': 'Sam and Sadie are infuriating and I loved them.',
  'The Wager|Nadia': 'I read the whole thing in two days and then read the source documents. Unbelievable.',
  'The Wager|Theo': 'Best non-fiction we have picked. Read it in the garden in one Sunday.',
  'The Wager|Maya': 'Trust nothing anyone says about the sea in 1741.',
  'Station Eleven|Lena':
    'Survival is insufficient. That is it. That is the review. SPOILER: the comic book sections break my heart.',
  'Station Eleven|Priya': 'The first pandemic novel I could actually stomach. Lovely and strange.',
  'Station Eleven|Jonas': 'Structurally clever, emotionally a little cool for me.',
  'Station Eleven|Theo': 'I kept thinking about it for weeks, which is its own kind of rating.',
}

const SEED_NOMINATIONS = [
  {
    title: 'James',
    author: 'Percival Everett',
    note: 'Huckleberry Finn from Jim’s side. Everyone says it is extraordinary.',
    by: 'Lena',
    votes: ['Maya', 'Priya', 'Nadia'],
  },
  {
    title: 'Martyr!',
    author: 'Kaveh Akbar',
    note: 'Poet writes a novel about a man obsessed with martyrs. Very us.',
    by: 'Nadia',
    votes: ['Jonas', 'Theo'],
  },
  {
    title: 'Blue Sisters',
    author: 'Coco Mellors',
    note: 'Three sisters, one year, a lot of grief. I need the group chat’s opinion.',
    by: 'Sam',
    votes: ['Maya'],
  },
  {
    title: 'The Ministry of Time',
    author: 'Kaliane Bradley',
    note: 'Time travel, paperwork, and a very charming 19th century man. Sci-fi but literary.',
    by: 'Priya',
    votes: [],
  },
]

function monthOffset(monthsAgo: number, now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1))
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }
}

export function seedDemo(): boolean {
  if (isSeeded()) return false

  const members = SEED_MEMBERS.map((m) => createMember(m))
  const byName = new Map(members.map((m) => [m.name, m]))

  const reviewsByBook = new Map<string, string[]>()

  SEED_BOOKS.forEach((seed, index) => {
    const monthsAgo = SEED_BOOKS.length - 1 - index
    const { month, year } = monthOffset(monthsAgo)
    const isCurrent = index === SEED_BOOKS.length - 1
    const id = `bk_seed_${index}`
    const picker = members[index % members.length]

    db.prepare(
      `INSERT INTO books (id, title, author, cover_url, month, year, description, page_count, genre, status, picker_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      seed.title,
      seed.author,
      seed.cover,
      month,
      year,
      seed.description,
      seed.pages,
      seed.genre,
      isCurrent ? 'current' : 'read',
      picker?.id ?? null,
      new Date(Date.UTC(year, month - 1, 4)).toISOString(),
    )

    const reviewIds: string[] = []
    seed.ratings.forEach((rating, memberIndex) => {
      if (rating === null) return
      const member = members[memberIndex]
      if (!member) return
      const body = SEED_REVIEWS[`${seed.title}|${member.name}`] ?? null
      const spoiler = Boolean(body?.includes('SPOILER'))
      const review = upsertReview({
        bookId: id,
        memberId: member.id,
        rating,
        body: body?.replace(/SPOILER:?\s*/g, ''),
        spoiler,
      })
      // Backdate the review to a few days after the meeting-ish.
      const when = new Date(Date.UTC(year, month, 6 + memberIndex * 2))
      db.prepare(`UPDATE reviews SET created_at = ?, updated_at = ? WHERE id = ?`).run(
        when.toISOString(),
        when.toISOString(),
        review.id,
      )
      reviewIds.push(review.id)
    })
    reviewsByBook.set(id, reviewIds)
  })

  // A few reactions so the feed has life in it.
  const reactionPlan: [number, string, number][] = [
    [2, '✓', 0],
    [2, '✓', 4],
    [4, '✓', 2],
    [4, '✓', 5],
    [7, '✓', 1],
    [7, '✓', 6],
    [6, '✓', 0],
    [6, '✓', 3],
    [1, '✓', 5],
    [8, '✓', 2],
  ]
  for (const [bookIndex, emoji, memberIndex] of reactionPlan) {
    const bookId = `bk_seed_${bookIndex}`
    const ids = reviewsByBook.get(bookId)
    const member = members[memberIndex]
    if (!ids?.length || !member) continue
    const target = ids[memberIndex % ids.length]
    if (!target) continue
    db.prepare(
      `INSERT OR IGNORE INTO reactions (id, review_id, member_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(`rxn_seed_${bookIndex}_${memberIndex}`, target, member.id, emoji, nowIso())
  }

  // Current book is half read by the club, in various states of denial.
  const currentBookId = `bk_seed_${SEED_BOOKS.length - 1}`
  const progressPlan = [0.62, 0.18, 0.95, 0.4, 0.05, 0.12, 0.73]
  members.forEach((member, i) => {
    setProgress(currentBookId, member.id, Math.round((progressPlan[i] ?? 0) * 100))
  })

  for (const nom of SEED_NOMINATIONS) {
    const by = byName.get(nom.by) ?? members[0]
    if (!by) continue
    const created = createNomination({
      title: nom.title,
      author: nom.author,
      note: nom.note,
      memberId: by.id,
    })
    for (const voter of nom.votes) {
      const m = byName.get(voter)
      if (m) toggleNominationVote(created.id, m.id)
    }
  }

  return true
}
