/**
 * 3SixBookClub house mark.
 *
 * An original, stylised gorgon head — a face framed by a crown of curling
 * serpents. It is drawn from scratch for this project and is not the Versace
 * trademark; drop in a licensed asset if the club ever needs the real one.
 *
 * Everything is stroked in `currentColor`, so the mark inherits whatever
 * colour its container sets (white on black, black on white, …).
 */

interface Curl {
  angle: number
  d: string
  width: number
}

const CURL_LONG =
  'M0 -10 C 4 -14 1 -19 5 -23 C 8 -26 6 -30 2.5 -30.5 C 0 -31 -1.5 -29 -0.5 -27.3'
const CURL_MID =
  'M0 -10 C 3.5 -13.5 1 -18 4.5 -22 C 7 -25 5 -28.5 2 -29 C -0.3 -29.4 -1.6 -27.6 -0.8 -26'

const CURLS: Curl[] = [
  { angle: -150, d: CURL_LONG, width: 3.1 },
  { angle: -100, d: CURL_MID, width: 2.9 },
  { angle: -50, d: CURL_LONG, width: 2.7 },
  { angle: 0, d: CURL_LONG, width: 3.1 },
  { angle: 50, d: CURL_LONG, width: 2.7 },
  { angle: 100, d: CURL_MID, width: 2.9 },
  { angle: 150, d: CURL_LONG, width: 3.1 },
]

export function MedusaMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      className={className}
      role="img"
      aria-label="Gorgon head"
    >
      <g strokeLinecap="round" strokeLinejoin="round">
        {CURLS.map((curl) => (
          <g key={curl.angle} transform={`translate(32 34) rotate(${curl.angle})`}>
            <path d={curl.d} strokeWidth={curl.width} />
          </g>
        ))}
      </g>
      <circle cx="32" cy="34" r="13" strokeWidth={2.6} />
      <circle cx="27.4" cy="33" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="36.6" cy="33" r="1.9" fill="currentColor" stroke="none" />
      <path d="M28.8 40 Q32 38.8 35.2 40" strokeWidth={1.8} />
    </svg>
  )
}

/** The wordmark: 3SIX | BOOK CLUB. */
export function Wordmark({ withMark = true }: { withMark?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      {withMark && <MedusaMark className="h-7 w-7 text-ink" />}
      <span className="flex items-center gap-3">
        <span className="text-[0.95rem] leading-none font-semibold tracking-[0.32em] text-ink">
          3SIX
        </span>
        <span className="h-5 w-px bg-line" aria-hidden />
        <span className="text-[0.68rem] leading-none font-light tracking-[0.28em] text-muted">
          BOOK CLUB
        </span>
      </span>
    </span>
  )
}
