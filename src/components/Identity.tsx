import { useState } from 'react'
import { useClub } from '../lib/club.tsx'
import { Avatar, Button, Field, Modal } from './ui.tsx'

export function IdentityButton({
  primary = false,
  label,
}: {
  primary?: boolean
  label?: string
}) {
  const { me } = useClub()
  const [open, setOpen] = useState(false)

  return (
    <>
      {primary ? (
        <Button variant="primary" onClick={() => setOpen(true)}>
          {label ?? 'Join the club'}
        </Button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex cursor-pointer items-center gap-2 border border-line py-1 pr-3 pl-1 text-[0.68rem] tracking-[0.14em] text-muted uppercase transition hover:border-ink/40 hover:text-ink"
        >
          {me ? (
            <>
              <Avatar member={me} size={24} />
              <span className="hidden sm:inline">{me.name}</span>
            </>
          ) : (
            <>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-xs">
                ?
              </span>
              <span className="hidden sm:inline">Identify</span>
            </>
          )}
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={me ? 'Your club profile' : 'Join the club'}
      >
        <IdentityPanel onClose={() => setOpen(false)} />
      </Modal>
    </>
  )
}

function IdentityPanel({ onClose }: { onClose: () => void }) {
  const { snapshot, me, setMe, actions } = useClub()
  const [name, setName] = useState('')
  const [passcode, setPasscode] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)

  const requiresPasscode = snapshot?.club.passcodeRequired ?? false

  if (me && editing) {
    return (
      <div className="flex flex-col gap-4">
        <Field label="Display name">
          <input className="input" value={name || me.name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await actions.updateProfile({ name: name || me.name })
              setBusy(false)
              setEditing(false)
              onClose()
            }}
          >
            Save
          </Button>
        </div>
      </div>
    )
  }

  if (me) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar member={me} size={52} />
          <div>
            <p className="font-display text-xl">{me.name}</p>
            <p className="text-xs text-faint">
              Member since {new Date(me.joinedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setName(me.name)
              setEditing(true)
            }}
          >
            Edit name
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setMe(null)
              onClose()
            }}
          >
            Switch member
          </Button>
          <Button
            variant="ghost"
            className="text-rose"
            onClick={async () => {
              if (!confirm('Remove yourself and all of your ratings? This cannot be undone.')) return
              await actions.leave()
              onClose()
            }}
          >
            Leave the club
          </Button>
        </div>
        <p className="text-xs text-faint">
          Your name is remembered in this browser only. There are no accounts or passwords.
        </p>
      </div>
    )
  }

  const others = snapshot?.members ?? []

  return (
    <div className="flex flex-col gap-5">
      {others.length > 0 && (
        <div>
          <span className="label">Already a member? Pick yourself</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {others.map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  setMe(member.id)
                  onClose()
                }}
                className="flex cursor-pointer items-center gap-2 border border-line px-3 py-2 text-left transition hover:border-ink/40 hover:bg-raised"
              >
                <Avatar member={member} size={26} />
                <span className="truncate text-sm">{member.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-line pt-5">
        <span className="label">New here? Add yourself</span>
        <div className="flex flex-col gap-3">
          <input
            className="input"
            placeholder="Your name"
            value={name}
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
          />
          {requiresPasscode && (
            <input
              className="input"
              placeholder="Club passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          )}
          <Button
            variant="primary"
            disabled={!name.trim() || busy}
            onClick={async () => {
              setBusy(true)
              try {
                await actions.join(name.trim(), '', passcode)
                onClose()
              } catch {
                /* toast */
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Joining…' : 'Join the club'}
          </Button>
        </div>
      </div>
    </div>
  )
}
