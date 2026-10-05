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
  background: '#221d17',
  border: '1px solid #3a3227',
  borderRadius: 12,
  fontSize: 12,
  color: '#f6efe3',
  boxShadow: '0 20px 40px -20px rgba(0,0,0,.9)',
} as const

const axisStyle = { fill: '#7d7264', fontSize: 11 } as const

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
        <div className="flex rounded-full border border-line bg-void/50 p-0.5 text-xs">
          {(['club', 'everyone'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setMode(option)}
              className={`cursor-pointer rounded-full px-3 py-1.5 transition ${
                mode === option ? 'bg-amber/90 text-void' : 'text-muted hover:text-ink'
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
                <stop offset="0%" stopColor="#e0a458" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#e0a458" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2c261e" vertical={false} />
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
              labelStyle={{ color: '#f6efe3', marginBottom: 4 }}
              itemStyle={{ color: '#a89c88' }}
              cursor={{ stroke: '#3a3227' }}
              labelFormatter={(label: unknown) => String(label)}
            />
            {mode === 'club' ? (
              <Area
                type="monotone"
                dataKey="club"
                name="Club average"
                stroke="#e0a458"
                strokeWidth={2}
                fill="url(#clubFill)"
                connectNulls
                dot={{ r: 3, fill: '#e0a458', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ) : (
              activeMembers.map((member) => (
                <Line
                  key={member.id}
                  type="monotone"
                  dataKey={member.id}
                  name={member.name}
                  stroke={member.color}
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 2.5, fill: member.color, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              ))
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {mode === 'everyone' && (
        <div className="mt-3 flex flex-wrap gap-3">
          {activeMembers.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
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
            <CartesianGrid stroke="#2c261e" vertical={false} />
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
              labelStyle={{ color: '#f6efe3' }}
              itemStyle={{ color: '#a89c88' }}
              cursor={{ fill: 'rgba(224,164,88,0.06)' }}
            />
            <Bar dataKey="count" name="Reviews" radius={[6, 6, 0, 0]}>
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
          <CartesianGrid stroke="#2c261e" />
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
            itemStyle={{ color: '#a89c88' }}
            labelStyle={{ color: '#f6efe3' }}
            cursor={{ strokeDasharray: '3 3', stroke: '#3a3227' }}
            formatter={(value: unknown, name: unknown) =>
              name === 'y' ? [`${value} stars`, 'Rating'] : [String(value), 'Book']
            }
            labelFormatter={() => ''}
          />
          <Scatter name={member.name} data={points} fill={member.color} />
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
          <CartesianGrid stroke="#2c261e" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ ...axisStyle, fontSize: 12, fill: '#f6efe3' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            itemStyle={{ color: '#a89c88' }}
            labelStyle={{ color: '#f6efe3' }}
            cursor={{ fill: 'rgba(224,164,88,0.06)' }}
            formatter={(value: unknown, _name: unknown, item: unknown) => {
              const voters = (item as { payload?: { voters?: string } })?.payload?.voters
              return [`${value} ${Number(value) === 1 ? 'vote' : 'votes'}${voters ? ` — ${voters}` : ''}`, '']
            }}
          />
          <Bar dataKey="votes" name="Votes" radius={[0, 6, 6, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={index === 0 ? '#e0a458' : '#8a6636'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}