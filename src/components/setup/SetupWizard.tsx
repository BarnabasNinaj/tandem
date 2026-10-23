import { useState, type FormEvent } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { testGitHubConnection } from '@/lib/github'
import { useTandemStore } from '@/store/tandem-store'

const STEPS = ['GitHub', 'Token', 'Household', 'Password'] as const

export function SetupWizard() {
  const completeSetup = useTandemStore((s) => s.completeSetup)
  const error = useTandemStore((s) => s.error)
  const syncing = useTandemStore((s) => s.syncing)

  const [step, setStep] = useState(0)
  const [username, setUsername] = useState('')
  const [repo, setRepo] = useState('tandem')
  const [pat, setPat] = useState('')
  const [partnerA, setPartnerA] = useState('')
  const [partnerB, setPartnerB] = useState('')
  const [currencySymbol, setCurrencySymbol] = useState('€')
  const [currencyLocale, setCurrencyLocale] = useState('sk-SK')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [testMsg, setTestMsg] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

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
    if (step === 1 && !pat.startsWith('github_pat_') && !pat.startsWith('ghp_')) {
      setLocalError('Paste a Fine-Grained PAT (github_pat_…).')
      return
    }
    if (step === 2 && (!partnerA.trim() || !partnerB.trim())) {
      setLocalError('Both partner names are required.')
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const onFinish = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match.')
      return
    }
    try {
      await completeSetup({
        github: { username: username.trim(), repo: repo.trim(), pat: pat.trim() },
        password,
        partnerAName: partnerA.trim(),
        partnerBName: partnerB.trim(),
        currencySymbol,
        currencyLocale,
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
      <div className="relative z-10 w-full max-w-xl">
        <p className="mb-1 font-[family-name:var(--font-display)] text-4xl font-semibold text-teal-900 dark:text-teal-300">
          Tandem
        </p>
        <p className="mb-8 text-stone-600 dark:text-stone-400">
          Zero-knowledge setup — nothing leaves this device unencrypted.
        </p>

        <div className="mb-6 flex gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1">
              <div
                className={`h-1 rounded-full transition-colors ${
                  i <= step ? 'bg-teal-700' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              />
              <span className="text-[10px] font-medium tracking-wide text-stone-500 uppercase">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/70">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
                <Shield className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Create private data repo</h2>
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-600 dark:text-stone-400">
                <li>
                  Go to GitHub → New Repository. Name it{' '}
                  <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">
                    tandem
                  </code>{' '}
                  (or any private name).
                </li>
                <li>
                  Visibility: <strong>Private</strong> — never Public.
                </li>
                <li>Initialize with a README.md file.</li>
              </ol>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gh-user">GitHub username</Label>
                  <Input
                    id="gh-user"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your-username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gh-repo">Repository name</Label>
                  <Input
                    id="gh-repo"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
                <Shield className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Fine-grained PAT</h2>
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-600 dark:text-stone-400">
                <li>
                  Settings → Developer Settings → Personal Access Tokens →
                  Fine-grained tokens.
                </li>
                <li>
                  Token name: <em>Tandem PWA Sync</em>. Expiration: 1 year.
                </li>
                <li>
                  Repository access: Only select repositories → choose your
                  tandem repo.
                </li>
                <li>
                  Permissions → Contents: <strong>Read and write</strong>.
                </li>
              </ol>
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline dark:text-teal-400"
              >
                Open token generator <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <div className="space-y-1.5">
                <Label htmlFor="pat">Personal Access Token</Label>
                <Input
                  id="pat"
                  type="password"
                  autoFocus
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="github_pat_…"
                />
              </div>
              <Button type="button" variant="secondary" onClick={() => void testConnection()}>
                Test connection
              </Button>
              {testMsg && (
                <p className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-300">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  {testMsg}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Household
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pa">Partner A name</Label>
                  <Input
                    id="pa"
                    autoFocus
                    value={partnerA}
                    onChange={(e) => setPartnerA(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pb">Partner B name</Label>
                  <Input
                    id="pb"
                    value={partnerB}
                    onChange={(e) => setPartnerB(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cur">Currency symbol</Label>
                  <Input
                    id="cur"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc">Locale</Label>
                  <Input
                    id="loc"
                    value={currencyLocale}
                    onChange={(e) => setCurrencyLocale(e.target.value)}
                    placeholder="sk-SK"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={(e) => void onFinish(e)} className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Master password
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                This password never leaves your browser. It derives your
                AES-256-GCM key via PBKDF2. If you lose it, encrypted data cannot
                be recovered.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Password</Label>
                <Input
                  id="pw"
                  type="password"
                  autoFocus
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
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
              <Button type="submit" className="w-full" disabled={syncing}>
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating vault…
                  </>
                ) : (
                  'Create encrypted vault'
                )}
              </Button>
            </form>
          )}

          {(localError || error) && (
            <p className="mt-4 text-sm text-red-700 dark:text-red-400" role="alert">
              {localError || error}
            </p>
          )}

          {step < 3 && (
            <div className="mt-6 flex justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
              <Button type="button" onClick={next}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
