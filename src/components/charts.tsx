import { useState } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import type { Book, Member, Nomination, Review } from '../lib/api.ts'
import { bookOrder } from '../lib/api.ts'
import { buildTrend, ratingColor } from '../lib/stats.ts'

const tooltipStyle = {
  background: '#151515',
  border: '1px solid #262626',
  borderRadius: 0,
  fontSize: 12,
  color: '#f4f4f4',
  boxShadow: '0 20px 40px -20px rgba(0,0,0,.9)',
} as const

const axisStyle = { fill: '#6a6a6a', fontSize: 11 } as const

/** Members are told apart by value, not by hue. */
const MEMBER_SHADES = ['#f4f4f4', '#b8b8b8', '#8a8a8a', '#dcdcdc', '#6a6a6a', '#a0a0a0', '#cfcfcf']

/* ------------------------------------------------------------------ *
 * Club rating trend
 * ------------------------------------------------------------------ */

export function RatingTrend({
  books,
  members,
  reviews,
}: {
  books: Book[]
  members: Member[]
  reviews: Review[]
}) {
  const [mode, setMode] = useState<'club' | 'everyone'>('club')
  const data = buildTrend(books, reviews)
  const activeMembers = members.filter((m) => reviews.some((r) => r.memberId === m.id))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          How the club scored each pick, oldest to newest.
        </p>
        <div className="flex border border-line text-[0.65rem] tracking-[0.12em] uppercase">
          {(['club', 'everyone'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setMode(option)}
              className={`cursor-pointer px-3 py-1.5 transition ${
                mode === option ? 'bg-ink text-void' : 'text-muted hover:text-ink'
              }`}
            >
              {option === 'club' ? 'Club average' : 'Everyone'}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="clubFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f4f4f4" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#f4f4f4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1c1c1c" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis
              domain={[0.5, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: '#f4f4f4', marginBottom: 4 }}
              itemStyle={{ color: '#9a9a9a' }}
              cursor={{ stroke: '#333333' }}
              labelFormatter={(label: unknown) => String(label)}
            />
            {mode === 'club' ? (
              <Area
                type="monotone"
                dataKey="club"
                name="Club average"
                stroke="#f4f4f4"
                strokeWidth={2}
                fill="url(#clubFill)"
                connectNulls
                dot={{ r: 3, fill: '#f4f4f4', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ) : (
              activeMembers.map((member, index) => (
                <Line
                  key={member.id}
                  type="monotone"
                  dataKey={member.id}
                  name={member.name}
                  stroke={MEMBER_SHADES[index % MEMBER_SHADES.length]}
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 2.5, fill: MEMBER_SHADES[index % MEMBER_SHADES.length], strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              ))
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {mode === 'everyone' && (
        <div className="mt-3 flex flex-wrap gap-3">
          {activeMembers.map((m, index) => (
            <span key={m.id} className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span
                className="h-2 w-2"
                style={{ background: MEMBER_SHADES[index % MEMBER_SHADES.length] }}
              />
              {m.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Rating distribution
 * ------------------------------------------------------------------ */

export function RatingDistribution({
  distribution,
  count,
  spread,
  height = 200,
  showAverage = true,
}: {
  distribution: number[]
  count: number
  spread?: number | null
  height?: number
  showAverage?: boolean
}) {
  const data = distribution.map((value, index) => ({
    stars: `${(index + 1) / 2}★`,
    rating: (index + 1) / 2,
    count: value,
  }))

  return (
    <div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="#1c1c1c" vertical={false} />
            <XAxis dataKey="stars" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis
              allowDecimals={false}
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: '#f4f4f4' }}
              itemStyle={{ color: '#9a9a9a' }}
              cursor={{ fill: 'rgba(244,244,244,0.05)' }}
            />
            <Bar dataKey="count" name="Reviews">
              {data.map((entry) => (
                <Cell key={entry.stars} fill={ratingColor(entry.rating)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {showAverage && (
        <p className="mt-2 text-center text-xs text-faint">
          {count} {count === 1 ? 'rating' : 'ratings'}
          {spread != null && ` · spread of ${spread.toFixed(2)} stars`}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * A member's ratings over time
 * ------------------------------------------------------------------ */

export function MemberScatter({
  member,
  books,
  reviews,
}: {
  member: Member
  books: Book[]
  reviews: Review[]
}) {
  const ordered = [...books].sort((a, b) => bookOrder(a) - bookOrder(b))
  const indexById = new Map(ordered.map((b, i) => [b.id, i]))

  const points = reviews
    .filter((r) => r.memberId === member.id)
    .map((r) => ({
      x: indexById.get(r.bookId) ?? 0,
      y: r.rating,
      title: books.find((b) => b.id === r.bookId)?.title ?? '',
    }))
    .sort((a, b) => a.x - b.x)

  const ticks = ordered.map((b, i) => ({ i, label: b.title }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, bottom: 4, left: -22 }}>
          <CartesianGrid stroke="#1c1c1c" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[-0.5, ordered.length - 0.5]}
            ticks={ticks.map((t) => t.i)}
            tickFormatter={(value: number) => ticks[value]?.label.slice(0, 10) ?? ''}
            tick={{ ...axisStyle, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0.5, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ZAxis range={[90, 90]} />
          <Tooltip
            contentStyle={tooltipStyle}
            itemStyle={{ color: '#9a9a9a' }}
            labelStyle={{ color: '#f4f4f4' }}
            cursor={{ strokeDasharray: '3 3', stroke: '#333333' }}
            formatter={(value: unknown, name: unknown) =>
              name === 'y' ? [`${value} stars`, 'Rating'] : [String(value), 'Book']
            }
            labelFormatter={() => ''}
          />
          <Scatter name={member.name} data={points} fill="#f4f4f4" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Nomination vote bars
 * ------------------------------------------------------------------ */

export function VoteBars({
  nominations,
  members,
}: {
  nominations: Nomination[]
  members: Member[]
}) {
  const data = [...nominations]
    .sort((a, b) => b.voterIds.length - a.voterIds.length)
    .map((n) => ({
      name: n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title,
      votes: n.voterIds.length,
      voters: n.voterIds
        .map((id) => members.find((m) => m.id === id)?.name ?? '')
        .filter(Boolean)
        .join(', '),
    }))

  if (!data.length) return null

  return (
    <div style={{ height: Math.max(120, data.length * 46) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="#1c1c1c" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ ...axisStyle, fontSize: 12, fill: '#f4f4f4' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            itemStyle={{ color: '#9a9a9a' }}
            labelStyle={{ color: '#f4f4f4' }}
            cursor={{ fill: 'rgba(244,244,244,0.05)' }}
            formatter={(value: unknown, _name: unknown, item: unknown) => {
              const voters = (item as { payload?: { voters?: string } })?.payload?.voters
              return [`${value} ${Number(value) === 1 ? 'vote' : 'votes'}${voters ? ` — ${voters}` : ''}`, '']
            }}
          />
          <Bar dataKey="votes" name="Votes">
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={index === 0 ? '#f4f4f4' : '#4f4f4f'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}