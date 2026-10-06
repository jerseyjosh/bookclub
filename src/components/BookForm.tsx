import { useEffect, useState } from 'react'
import type { Book } from '../lib/api.ts'
import { MONTHS } from '../lib/api.ts'
import { lookupBooks, type LookupResult } from '../lib/api.ts'
import { useClub } from '../lib/club.tsx'
import { Button, Cover, Field, Modal } from './ui.tsx'

interface FormState {
  title: string
  author: string
  month: number
  year: number
  genre: string
  pageCount: string
  coverUrl: string
  description: string
  status: 'read' | 'current' | 'upcoming'
  pickerId: string
}

function initial(book?: Book): FormState {
  const now = new Date()
  return {
    title: book?.title ?? '',
    author: book?.author ?? '',
    month: book?.month ?? now.getMonth() + 1,
    year: book?.year ?? now.getFullYear(),
    genre: book?.genre ?? '',
    pageCount: book?.pageCount ? String(book.pageCount) : '',
    coverUrl: book?.coverUrl ?? '',
    description: book?.description ?? '',
    status: book?.status ?? 'read',
    pickerId: book?.pickerId ?? '',
  }
}

export function BookFormModal({
  open,
  onClose,
  book,
}: {
  open: boolean
  onClose: () => void
  book?: Book
}) {
  const { snapshot, actions } = useClub()
  const [form, setForm] = useState<FormState>(() => initial(book))
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<LookupResult[]>([])

  useEffect(() => {
    if (open) {
      setForm(initial(book))
      setResults([])
      setQuery('')
    }
  }, [open, book])

  const patch = (part: Partial<FormState>) => setForm((prev) => ({ ...prev, ...part }))

  const search = async () => {
    if (query.trim().length < 2) return
    setSearching(true)
    try {
      const data = await lookupBooks(query)
      setResults(data.results)
    } finally {
      setSearching(false)
    }
  }

  const applyResult = (result: LookupResult) => {
    patch({
      title: result.title,
      author: result.author,
      coverUrl: result.coverUrl ?? '',
      pageCount: result.pageCount ? String(result.pageCount) : form.pageCount,
      genre: form.genre || (result.genre ?? ''),
    })
    setResults([])
  }

  const submit = async () => {
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        author: form.author.trim(),
        month: Number(form.month),
        year: Number(form.year),
        genre: form.genre.trim() || null,
        pageCount: form.pageCount ? Number(form.pageCount) : null,
        coverUrl: form.coverUrl.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
        pickerId: form.pickerId || null,
      }
      if (book) await actions.updateBook(book.id, payload)
      else await actions.addBook(payload)
      onClose()
    } catch {
      /* toast has it */
    } finally {
      setSaving(false)
    }
  }

  const years = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() + 1 - i)
  const currentYear = new Date().getFullYear()
  if (!years.includes(currentYear)) years.push(currentYear)

  return (
    <Modal open={open} onClose={onClose} title={book ? 'Edit book' : 'Add a book'} wide>
      {!book && (
        <div className="mb-5 border border-line bg-void/40 p-3">
          <span className="label">Autofill from Open Library</span>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Title, author or ISBN…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void search()
                }
              }}
            />
            <Button onClick={() => void search()} disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </Button>
          </div>
          {results.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {results.map((result, index) => (
                <li key={`${result.title}-${index}`}>
                  <button
                    onClick={() => applyResult(result)}
                    className="flex w-full cursor-pointer items-center gap-3 border border-transparent px-2 py-2 text-left transition hover:border-line hover:bg-raised"
                  >
                    <span className="h-12 w-8 shrink-0 overflow-hidden border border-line bg-raised">
                      <Cover title={result.title} coverUrl={result.coverUrl} compact />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{result.title}</span>
                      <span className="block truncate text-xs text-faint">
                        {[result.author, result.year, result.pageCount && `${result.pageCount}pp`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title">
            <input
              className="input"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="The book we read this month"
            />
          </Field>
        </div>

        <Field label="Author">
          <input
            className="input"
            value={form.author}
            onChange={(e) => patch({ author: e.target.value })}
          />
        </Field>

        <Field label="Genre">
          <input
            className="input"
            value={form.genre}
            onChange={(e) => patch({ genre: e.target.value })}
            placeholder="Science Fiction"
          />
        </Field>

        <Field label="Month">
          <select
            className="input"
            value={form.month}
            onChange={(e) => patch({ month: Number(e.target.value) })}
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Year">
          <select
            className="input"
            value={form.year}
            onChange={(e) => patch({ year: Number(e.target.value) })}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Pages">
          <input
            className="input"
            inputMode="numeric"
            value={form.pageCount}
            onChange={(e) => patch({ pageCount: e.target.value.replace(/\D/g, '') })}
          />
        </Field>

        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => patch({ status: e.target.value as FormState['status'] })}
          >
            <option value="read">Read</option>
            <option value="current">Reading now</option>
            <option value="upcoming">Up next</option>
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Cover image URL" hint="Leave empty for a generated cover.">
            <input
              className="input"
              value={form.coverUrl}
              onChange={(e) => patch({ coverUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
        </div>

        <Field label="Who picked it">
          <select
            className="input"
            value={form.pickerId}
            onChange={(e) => patch({ pickerId: e.target.value })}
          >
            <option value="">Nobody yet</option>
            {snapshot?.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Why we picked it">
            <textarea
              className="input min-h-20 resize-y"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="A sentence for the group chat."
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!form.title.trim() || saving}
          onClick={() => void submit()}
        >
          {saving ? 'Saving…' : book ? 'Save changes' : 'Add to shelf'}
        </Button>
      </div>
    </Modal>
  )
}
