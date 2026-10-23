import { useState, type FormEvent } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTandemStore } from '@/store/tandem-store'

export function LockScreen() {
  const unlock = useTandemStore((s) => s.unlock)
  const phase = useTandemStore((s) => s.phase)
  const error = useTandemStore((s) => s.error)
  const github = useTandemStore((s) => s.github)
  const [password, setPassword] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!password) return
    void unlock(password)
  }

  const unlocking = phase === 'unlocking'

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(15,118,110,0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(68,64,60,0.12), transparent), linear-gradient(165deg, #f4f7f6 0%, #e8eeec 45%, #dfe8e5 100%)',
        }}
      />
      <div className="dark:pointer-events-none dark:absolute dark:inset-0 dark:block dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_-5%,rgba(45,212,191,0.12),transparent),linear-gradient(165deg,#0c1210_0%,#141a18_50%,#1a2220_100%)]" />

      <div className="relative z-10 w-full max-w-md animate-[fadeUp_0.6s_ease-out]">
        <p className="mb-2 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-teal-900 dark:text-teal-300 sm:text-6xl">
          Tandem
        </p>
        <p className="mb-10 max-w-sm text-base text-stone-600 dark:text-stone-400">
          Private, local-first household operating system. Your vault unlocks
          only in this browser.
        </p>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-stone-200/70 bg-white/70 p-6 shadow-lg backdrop-blur-md dark:border-stone-700/60 dark:bg-stone-900/60"
        >
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
            <Lock className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wide uppercase">
              Vault locked
            </span>
          </div>

          {github && (
            <p className="text-xs text-stone-500">
              Syncing {github.username}/{github.repo}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="master-password">Master password</Label>
            <Input
              id="master-password"
              type="password"
              autoFocus
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

          <Button type="submit" className="w-full" disabled={unlocking || !password}>
            {unlocking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Decrypting…
              </>
            ) : (
              'Unlock'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
