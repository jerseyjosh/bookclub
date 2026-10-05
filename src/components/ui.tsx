import {
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import type { Member } from '../lib/api.ts'
import { ratingLabel } from '../lib/api.ts'
import { useClub } from '../lib/club.tsx'

/* ------------------------------------------------------------------ *
 * Avatar
 * ------------------------------------------------------------------ */

export function Avatar({
  member,
  size = 36,
  ring = false,
  title,
}: {
  member: Member | undefined
  size?: number
  ring?: boolean
  title?: string
}) {
  if (!member) return null
  return (
    <span
      title={title ?? member.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none ${
        ring ? 'ring-2 ring-void' : ''
      }`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `${member.color}26`,
        color: member.color,
        border: `1px solid ${member.color}66`,
      }}
    >
      <span aria-hidden>{member.emoji}</span>
      <span className="sr-only">{member.name}</span>
    </span>
  )
}

export function AvatarStack({
  members,
  size = 28,
  max = 6,
}: {
  members: Member[]
  size?: number
  max?: number
}) {
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <span key={m.id} className={i ? '-ml-2' : ''}>
          <Avatar member={m} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="-ml-2 inline-flex items-center justify-center rounded-full bg-high text-xs text-muted ring-2 ring-void"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      )}
    </div>
  )
}

export function MemberPill({ member, size = 24 }: { member: Member | undefined; size?: number }) {
  if (!member) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Avatar member={member} size={size} />
      <span className="text-muted">{member.name}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ *
 * Stars
 * ------------------------------------------------------------------ */

function StarIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-[1em] w-[1em] ${className}`} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.6l2.7 5.9 6.4.7-4.8 4.3 1.3 6.3L12 16.6 6.4 19.8l1.3-6.3L2.9 9.2l6.4-.7z"
      />
    </svg>
  )
}

interface StarsProps {
  value: number | null
  onChange?: (value: number) => void
  size?: number
  showValue?: boolean
  className?: string
}

export function Stars({ value, onChange, size = 18, showValue = false, className = '' }: StarsProps) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0
  const interactive = Boolean(onChange)

  const row = useMemo(() => [1, 2, 3, 4, 5], [])

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className="relative inline-flex select-none"
        style={{ fontSize: size }}
        onMouseLeave={() => setHover(null)}
      >
        <span className="flex gap-[0.12em] text-line" aria-hidden>
          {row.map((i) => (
            <StarIcon key={i} />
          ))}
        </span>
        <span
          className="pointer-events-none absolute inset-0 flex gap-[0.12em] overflow-hidden text-amber"
          style={{ width: `${(Math.max(0, Math.min(5, shown)) / 5) * 100}%` }}
          aria-hidden
        >
          {row.map((i) => (
            <StarIcon key={i} className="shrink-0" />
          ))}
        </span>
        {interactive && (
          <span className="absolute inset-0 flex gap-[0.12em]">
            {row.map((i) => (
              <span key={i} className="relative h-[1em] w-[1em]">
                <button
                  type="button"
                  aria-label={`${i - 0.5} stars`}
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(i - 0.5)}
                  onClick={() => onChange?.(i - 0.5)}
                />
                <button
                  type="button"
                  aria-label={`${i} stars`}
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(i)}
                  onClick={() => onChange?.(i)}
                />
              </span>
            ))}
          </span>
        )}
      </span>
      {showValue && (
        <span className="font-display text-base text-amber">
          {value === null ? '—' : ratingLabel(value)}
        </span>
      )}
    </span>
  )
}

export function RatingBadge({
  value,
  count,
  size = 'md',
}: {
  value: number | null
  count?: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const text = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-base'
  if (value === null) {
    return <span className="text-sm text-faint">Not rated yet</span>
  }
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={`font-display ${text} text-amber`}>{ratingLabel(value)}</span>
      <span className="text-xs text-faint">/ 5{count !== undefined ? ` · ${count}` : ''}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ *
 * Cover art
 * ------------------------------------------------------------------ */

const SPINE_GRADIENTS = [
  ['#3b2f23', '#6b4a2a'],
  ['#22303a', '#33566b'],
  ['#2f2a3a', '#54406b'],
  ['#2b3630', '#40614c'],
  ['#3a2626', '#6b3a3a'],
  ['#3a3322', '#6b5a2a'],
]

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function Cover({
  title,
  author,
  coverUrl,
  className = '',
  compact = false,
}: {
  title: string
  author?: string | null
  coverUrl?: string | null
  className?: string
  compact?: boolean
}) {
  const [broken, setBroken] = useState(false)
  const palette = SPINE_GRADIENTS[hash(title) % SPINE_GRADIENTS.length] ?? SPINE_GRADIENTS[0]!

  if (coverUrl && !broken) {
    return (
      <img
        src={coverUrl}
        alt={`${title} cover`}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex h-full w-full flex-col justify-end p-3 text-ink ${className}`}
      style={{ background: `linear-gradient(150deg, ${palette[0]}, ${palette[1]})` }}
      aria-label={`${title} cover`}
    >
      <div className="mb-auto h-1 w-8 rounded-full bg-white/25" />
      <p className={compact ? 'text-xs leading-tight font-medium' : 'font-display text-lg leading-tight'}>
        {title}
      </p>
      {author && <p className="mt-1 text-[0.7rem] text-white/60">{author}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Layout bits
 * ------------------------------------------------------------------ */

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stat({
  label,
  children,
  hint,
  className = '',
}: {
  label: string
  children: ReactNode
  hint?: string
  className?: string
}) {
  return (
    <div className={`card p-4 ${className}`}>
      <p className="text-xs font-semibold tracking-wide text-faint uppercase">{label}</p>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function ProgressBar({
  percent,
  className = '',
  color,
}: {
  percent: number
  className?: string
  color?: string
}) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-void/70 ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${clamped}%`,
          background: color ?? 'linear-gradient(90deg, #b8803c, #e0a458)',
        }}
      />
    </div>
  )
}

export function Chip({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'amber' | 'sage' | 'rose' | 'sky'
}) {
  const tones = {
    default: 'border-line bg-raised/80 text-muted',
    amber: 'border-amber/40 bg-amber/10 text-amber-soft',
    sage: 'border-sage/40 bg-sage/10 text-sage',
    rose: 'border-rose/40 bg-rose/10 text-rose',
    sky: 'border-sky/40 bg-sky/10 text-sky',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Button({
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost'
  size?: 'md' | 'sm'
}) {
  const variants = {
    default: 'btn',
    primary: 'btn btn-primary',
    ghost: 'btn btn-ghost',
  }
  return (
    <button
      className={`${variants[variant]} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
      {...props}
    />
  )
}

export function EmptyState({
  icon = '📖',
  title,
  children,
}: {
  icon?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="font-display text-xl">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Forms
 * ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  )
}

/* ------------------------------------------------------------------ *
 * Modal
 * ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div
        className="fixed inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-rise relative my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} card bg-surface p-5 shadow-lift`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Toasts
 * ------------------------------------------------------------------ */

export function ToastViewport() {
  const { toasts, dismissToast } = useClub()
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-72 flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismissToast(toast.id)}
          className={`animate-rise pointer-events-auto rounded-xl border px-4 py-3 text-left text-sm shadow-lift backdrop-blur ${
            toast.tone === 'error'
              ? 'border-rose/50 bg-rose/15 text-rose'
              : 'border-amber/40 bg-raised/95 text-ink'
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 p-10 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-amber" />
      {label}…
    </div>
  )
}
