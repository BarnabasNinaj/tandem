import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/lock/AuthShell'
import { useTandemStore } from '@/store/tandem-store'

export function LockScreen() {
  const unlock = useTandemStore((s) => s.unlock)
  const phase = useTandemStore((s) => s.phase)
  const error = useTandemStore((s) => s.error)
  const [password, setPassword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus without scrolling — autoFocus scrolls the page and feels like a jump.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!password) return
    void unlock(password)
  }

  const unlocking = phase === 'unlocking'

  return (
    <AuthShell tagline="Private, local-first household operating system. Your vault unlocks only in this browser.">
      <form onSubmit={onSubmit} className="auth-card">
        <div className="auth-status">
          <Lock className="auth-status-icon" aria-hidden />
          <span>Vault locked</span>
        </div>

        <div className="auth-field">
          <label htmlFor="master-password" className="auth-label">
            Master password
          </label>
          <input
            ref={inputRef}
            id="master-password"
            className="auth-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter master password"
            disabled={unlocking}
          />
        </div>

        {error && (
          <p className="text-sm text-red-700 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="auth-btn"
          disabled={unlocking || !password}
        >
          {unlocking ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Decrypting…
            </span>
          ) : (
            'Unlock'
          )}
        </button>
      </form>
    </AuthShell>
  )
}
