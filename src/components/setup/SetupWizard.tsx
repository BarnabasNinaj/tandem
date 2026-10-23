import { useCallback, useState, type FormEvent } from 'react'
import { ArrowRight, Check, CheckCircle2, Loader2, QrCode } from 'lucide-react'
import { QrScanner } from '@/components/invite/QrScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { decodeDeviceInvite } from '@/lib/device-invite'
import { testGitHubConnection } from '@/lib/github'
import { useTandemStore } from '@/store/tandem-store'

type Mode = 'choose' | 'scan' | 'manual'
type ManualStep = 0 | 1 | 2

export function SetupWizard() {
  const completeSetup = useTandemStore((s) => s.completeSetup)
  const error = useTandemStore((s) => s.error)
  const syncing = useTandemStore((s) => s.syncing)

  const [mode, setMode] = useState<Mode>('choose')
  const [step, setStep] = useState<ManualStep>(0)
  const [fromInvite, setFromInvite] = useState(false)
  const [username, setUsername] = useState('')
  const [repo, setRepo] = useState('')
  const [pat, setPat] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [testMsg, setTestMsg] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const applyInvite = useCallback((raw: string) => {
    const config = decodeDeviceInvite(raw)
    if (!config) {
      setLocalError('Couldn’t read that invite. Scan again or paste the full text.')
      return false
    }
    setUsername(config.username)
    setRepo(config.repo)
    setPat(config.pat)
    setFromInvite(true)
    setMode('manual')
    setStep(2)
    setLocalError(null)
    return true
  }, [])

  const onScanned = useCallback(
    (text: string) => {
      applyInvite(text)
    },
    [applyInvite],
  )

  const testConnection = async () => {
    setTestMsg(null)
    const result = await testGitHubConnection({ username, repo, pat })
    setTestMsg(result.message)
  }

  const next = () => {
    setLocalError(null)
    if (step === 0 && (!username.trim() || !repo.trim())) {
      setLocalError('Username and repository are required.')
      return
    }
    if (step === 1 && !pat.trim()) {
      setLocalError('Token is required.')
      return
    }
    setStep((s) => Math.min(s + 1, 2) as ManualStep)
  }

  const onFinish = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }
    if (!fromInvite && password !== confirm) {
      setLocalError('Passwords do not match.')
      return
    }
    try {
      await completeSetup({
        github: {
          username: username.trim(),
          repo: repo.trim(),
          pat: pat.trim(),
        },
        password,
      })
    } catch {
      /* store sets error */
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 0%, rgba(15,118,110,0.18), transparent), linear-gradient(180deg, #f4f7f6, #e4ebe8)',
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <p className="logo-mark-on-light mb-1 text-4xl">Tandem</p>
        <p className="mb-8 text-stone-700">
          {mode === 'choose'
            ? 'Join with a partner invite, or set up sync yourself.'
            : fromInvite
              ? 'Invite applied — enter the shared master password.'
              : 'Connect your private vault, then set a master password.'}
        </p>

        <div className="rounded-2xl border border-stone-300 bg-white p-6 shadow-lg">
          {mode === 'choose' && (
            <div className="space-y-3">
              <Button
                type="button"
                className="w-full !bg-teal-800 !text-white hover:!bg-teal-900"
                onClick={() => {
                  setLocalError(null)
                  setMode('scan')
                }}
              >
                <QrCode className="h-4 w-4" />
                Scan QR Code
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full !bg-stone-200 !text-stone-950 hover:!bg-stone-300"
                onClick={() => {
                  setFromInvite(false)
                  setMode('manual')
                  setStep(0)
                }}
              >
                Manual Set Up
              </Button>
            </div>
          )}

          {mode === 'scan' && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Scan invite
              </h2>
              <p className="text-sm text-stone-700 dark:text-stone-400">
                Point the camera at the QR from your partner’s Settings → Add a
                device.
              </p>
              <QrScanner
                onScan={onScanned}
                onCancel={() => {
                  setMode('choose')
                  setLocalError(null)
                }}
              />
            </div>
          )}

          {mode === 'manual' && (
            <>
              {!fromInvite && (
                <div className="mb-6 flex gap-2">
                  {(['GitHub', 'Token', 'Password'] as const).map((label, i) => (
                    <div key={label} className="flex flex-1 flex-col gap-1">
                      <div
                        className={`h-1 rounded-full transition-colors ${
                          i <= step
                            ? 'bg-teal-700'
                            : 'bg-stone-300 dark:bg-stone-700'
                        }`}
                      />
                      <span className="text-[10px] font-medium tracking-wide text-stone-700 uppercase dark:text-stone-400">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                    GitHub
                  </h2>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="gh-user">Username</Label>
                      <Input
                        id="gh-user"
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="your-username"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gh-repo">Repository</Label>
                      <Input
                        id="gh-repo"
                        value={repo}
                        onChange={(e) => setRepo(e.target.value)}
                        placeholder="Repository name"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                    Token
                  </h2>
                  <div className="space-y-1.5">
                    <Label htmlFor="pat">Token</Label>
                    <Input
                      id="pat"
                      type="password"
                      autoFocus
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      placeholder="Token"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void testConnection()}
                    >
                      Test connection
                    </Button>
                    {testMsg && (
                      <p className="flex items-center gap-1.5 text-sm text-stone-700 dark:text-stone-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
                        {testMsg}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <form onSubmit={(e) => void onFinish(e)} className="space-y-4">
                  <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                    Master password
                  </h2>
                  {fromInvite ? (
                    <p className="text-sm text-stone-700 dark:text-stone-400">
                      Connected to {username}/{repo}. Use the same password as
                      your partner — never stored in the QR.
                    </p>
                  ) : (
                    <p className="text-sm text-stone-700 dark:text-stone-400">
                      Never leaves this browser. Household details can be set
                      later in Settings.
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="pw">Password</Label>
                    <Input
                      id="pw"
                      type="password"
                      autoFocus
                      autoComplete={
                        fromInvite ? 'current-password' : 'new-password'
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {!fromInvite && (
                    <div className="space-y-1.5">
                      <Label htmlFor="pw2">Confirm</Label>
                      <Input
                        id="pw2"
                        type="password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                      />
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={syncing}>
                    {syncing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {fromInvite ? 'Unlocking…' : 'Creating vault…'}
                      </>
                    ) : fromInvite ? (
                      'Unlock vault'
                    ) : (
                      'Create encrypted vault'
                    )}
                  </Button>
                </form>
              )}

              {(localError || error) && (
                <p
                  className="mt-4 text-sm text-red-700 dark:text-red-400"
                  role="alert"
                >
                  {localError || error}
                </p>
              )}

              {step < 2 && (
                <div className="mt-6 flex justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (step === 0) {
                        setMode('choose')
                        return
                      }
                      setStep((s) => (s - 1) as ManualStep)
                    }}
                  >
                    Back
                  </Button>
                  <Button type="button" className="group" onClick={next}>
                    Continue
                    <ArrowRight className="h-4 w-4 group-hover:hidden" />
                    <Check className="hidden h-4 w-4 group-hover:block" />
                  </Button>
                </div>
              )}

              {step === 2 && fromInvite && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={() => {
                    setMode('choose')
                    setFromInvite(false)
                    setPassword('')
                  }}
                >
                  Start over
                </Button>
              )}
            </>
          )}

          {mode !== 'manual' && (localError || error) && (
            <p
              className="mt-4 text-sm text-red-700 dark:text-red-400"
              role="alert"
            >
              {localError || error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
