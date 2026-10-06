# 3SixBookClub

A small, self-hosted site for a book club. One book a month, everyone rates it out of five,
everyone says what they thought — and the site turns all of that into charts and standings.

Black and white, nothing shouting. One Node process, one SQLite file, and a React front end
that gets served by the same process.

The house mark is an original gorgon head drawn for this project (`src/components/Medusa.tsx`),
not the Versace trademark — swap in a licensed asset if the club needs the real one.

## What is in it

**For the club**

- Monthly books with covers, blurbs, page counts, genres and who picked them
- Half-star ratings (0.5 → 5) and written reviews, with a spoiler toggle
- Emoji reactions on each other's reviews
- A per-member reading progress bar for the current book
- Nominations and voting for what to read next, and one click to schedule the winner

**For the data nerds**

- Club rating trend over time, per book or per member
- Rating distribution for every book and every member
- **Who rated what** heatmap: every member × every book, coloured by score
- **Taste match** matrix: how closely any two members' ratings correlate, plus each
  member's "taste twin"
- Auto-generated superlatives: crowd favourite, most divisive pick, toughest critic,
  most generous, never misses a month

## Quick start

```bash
npm install
npm run dev
```

- Web app: <http://localhost:5173>
- API: <http://localhost:3001/api/club>

On first boot the database is filled with a demo club (7 members, 10 months of books,
60+ reviews) so the charts have something to say. To start your own club:

```bash
npm run reset   # wipes everything
npm run seed    # puts the demo club back, if you want it
```

## Hosting it for your friends

Build the front end once, then run the server. It serves both the API and the UI on one port.

```bash
npm run build
npm start          # http://localhost:3001
```

### Docker

```bash
docker build -t bookclub .
docker run -p 3001:3001 -v bookclub-data:/app/data bookclub
```

The SQLite file lives in `/app/data`, which is a volume — back that up and you have backed
up the club.

### Anywhere else

It is a single Node process listening on `$PORT`, so it runs as-is on a VPS, Railway,
Render, Fly.io, a Raspberry Pi, or behind nginx/Caddy as a reverse proxy.

Two things worth knowing:

- **Set a passcode before you share the link.** `CLUB_PASSCODE=...` means only people who
  know it can add themselves as a member.
- **Back up `data/club.db`.** That is the entire club. Copy the file while the server is
  stopped, or use `sqlite3 data/club.db ".backup backup.db"`.

## Configuration

Copy `.env.example` to `.env` — every value is optional.

| Variable         | Default             | What it does                                        |
| ---------------- | ------------------- | --------------------------------------------------- |
| `PORT`           | `3001`              | Port for the API and the built site                 |
| `DB_PATH`        | `data/club.db`      | Where the SQLite file lives                         |
| `CLUB_NAME`      | `3SixBookClub`      | Shown in the header and browser tab                 |
| `CLUB_TAGLINE`   | `One book a month…` | Shown in the footer                                 |
| `CLUB_PASSCODE`  | _(empty)_           | If set, required to join as a new member            |
| `SEED_DEMO`      | `1`                 | `0` skips loading the demo club on a fresh database |

## How members identify themselves

There is no sign-up, no password and no email. A member picks a name, and the browser
remembers which member it is with `localStorage`. Avatars are just the member's initials.
The server checks the member id sent with every write, so members can only edit their own
reviews and profile.

That is deliberately enough for a group of friends sharing a link, and deliberately not
enough for anything public. If you want real auth, `server/api.ts` is the only file that
would need to change — every route already funnels through the `actor(req)` helper.

## Project layout

```
server/          Express + better-sqlite3, one file per concern
  db.ts          Schema, migrations-on-boot, config
  store.ts       All queries and writes (the only place SQL lives)
  api.ts         REST routes + validation (zod)
  seed.ts        The demo club
  index.ts       Server entry: API + static site
shared/types.ts  Types shared by server and client
src/             React + TypeScript + Tailwind front end
  lib/stats.ts   Every average, correlation and superlative
  components/    UI primitives, charts (Recharts) and heatmaps
  pages/         One file per route
```

## Scripts

| Script              | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | API with reload + Vite dev server            |
| `npm run build`     | Builds the front end into `dist/`            |
| `npm start`         | Production server (API + `dist/`) on `$PORT` |
| `npm run typecheck` | TypeScript across server, shared and client  |
| `npm run seed`      | Load the demo club (no-op if data exists)    |
| `npm run reset`     | Delete every member, book, review and vote   |

## Notes

- Book covers come from the Open Library covers API when you add a book by title, and you
  can paste any image URL instead. No internet? Books get a generated cover.
- The API is read-heavy and the whole club snapshot is one request, which is why the client
  can compute all the statistics locally. A book club is small enough for this to be the
  simple, fast choice.
