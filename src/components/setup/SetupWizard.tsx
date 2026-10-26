import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { ArrowRight, Check, CheckCircle2, Loader2, QrCode } from 'lucide-react'
import { QrScanner } from '@/components/invite/QrScanner'
import { AuthShell } from '@/components/lock/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  clearPendingInviteHash,
  consumeInviteHashFromLocation,
  decodeDeviceInvite,
  extractInviteMaterial,
  formatPairingCode,
  isEncryptedInvite,
  isLegacyCleartextInvite,
  normalizePairingCode,
} from '@/lib/device-invite'
import { fetchRemoteVault, testGitHubConnection } from '@/lib/github'
import { useTandemStore } from '@/store/tandem-store'
import type { GitHubConfig } from '@/types/tandem'

type Mode = 'choose' | 'scan' | 'pair' | 'manual'
type ManualStep = 0 | 1 | 2

export function SetupWizard() {
  const completeSetup = useTandemStore((s) => s.completeSetup)
  const error = useTandemStore((s) => s.error)
  const syncing = useTandemStore((s) => s.syncing)

  const [mode, setMode] = useState<Mode>('choose')
  const [step, setStep] = useState<ManualStep>(0)
  const [fromInvite, setFromInvite] = useState(false)
  /** True when remote `tandem_data.json.enc` already exists — unlock, don’t “create”. */
  const [joiningExisting, setJoiningExisting] = useState(false)
  const [probing, setProbing] = useState(false)
  const [unlockingInvite, setUnlockingInvite] = useState(false)
  const [username, setUsername] = useState('')
  const [repo, setRepo] = useState('')
  const [pat, setPat] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [invitePaste, setInvitePaste] = useState('')
  const [pendingInvite, setPendingInvite] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState('')
  const [testMsg, setTestMsg] = useState<string | null>(null)
  const [testOk, setTestOk] = useState<boolean | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [legacyWarning, setLegacyWarning] = useState<string | null>(null)
  const pairFailCount = useRef(0)

  const githubConfig = (): GitHubConfig => ({
    username: username.trim(),
    repo: repo.trim(),
    pat: pat.trim(),
  })

  const resetToChoose = useCallback(() => {
    clearPendingInviteHash()
    setPendingInvite(null)
    setPairingCode('')
    setInvitePaste('')
    setUsername('')
    setRepo('')
    setPat('')
    setPassword('')
    setConfirm('')
    setFromInvite(false)
    setJoiningExisting(false)
    setStep(0)
    setTestMsg(null)
    setTestOk(null)
    setLegacyWarning(null)
    setLocalError(null)
    pairFailCount.current = 0
    setMode('choose')
  }, [])

  const goToPasswordStep = useCallback(async (cfg: GitHubConfig) => {
    setProbing(true)
    setLocalError(null)
    setTestMsg(null)
    setTestOk(null)
    try {
      // Contents API returns 404 for missing file *and* missing/forbidden repo.
      // Prove repo access first so Continue cannot skip into “create password”.
      const access = await testGitHubConnection(cfg)
      setTestMsg(access.message)
      setTestOk(access.ok)
      if (!access.ok) {
        setLocalError(access.message)
        return
      }

      const remote = await fetchRemoteVault(cfg)
      setJoiningExisting(!!remote)
      setStep(2)
    } catch (e) {
      setLocalError(
        e instanceof Error
          ? e.message
          : 'Couldn’t reach GitHub to check for an existing vault.',
      )
    } finally {
      setProbing(false)
    }
  }, [])

  const applyConfig = useCallback(
    (config: GitHubConfig) => {
      clearPendingInviteHash()
      setUsername(config.username)
      setRepo(config.repo)
      setPat(config.pat)
      setFromInvite(true)
      setPendingInvite(null)
      setPairingCode('')
      setMode('manual')
      setPassword('')
      setConfirm('')
      setLocalError(null)
      void goToPasswordStep(config)
    },
    [goToPasswordStep],
  )

  const beginInvite = useCallback(
    async (raw: string, code?: string) => {
      setLocalError(null)
      const material = extractInviteMaterial(raw)
      if (!material) {
        setLocalError(
          'Couldn’t read that invite. Open the QR link in Tandem, or paste the full invite.',
        )
        return false
      }

      if (isEncryptedInvite(material)) {
        if (!code?.trim()) {
          setPendingInvite(material)
          setLegacyWarning(null)
          setMode('pair')
          return true
        }
        setUnlockingInvite(true)
        try {
          const config = await decodeDeviceInvite(material, code)
          if (!config) {
            pairFailCount.current += 1
            const delay = Math.min(4000, 400 * 2 ** (pairFailCount.current - 1))
            await new Promise((r) => setTimeout(r, delay))
            setLocalError('Wrong pairing code, or invite is corrupted.')
            setPendingInvite(material)
            setMode('pair')
            return false
          }
          pairFailCount.current = 0
          applyConfig(config)
          return true
        } finally {
          setUnlockingInvite(false)
        }
      }

      if (isLegacyCleartextInvite(material)) {
        // Old cleartext invites embed the PAT — require explicit confirm once.
        if (legacyWarning !== material) {
          setLegacyWarning(material)
          setLocalError(
            'This is a legacy cleartext invite (contains a PAT). Paste again and continue only if you trust this device, then rotate the token in GitHub.',
          )
          return false
        }
        const config = await decodeDeviceInvite(material)
        if (!config) {
          setLocalError('Couldn’t read that invite.')
          return false
        }
        setLegacyWarning(null)
        applyConfig(config)
        return true
      }

      // Encrypted blob without detectable prefix — try with code
      if (code?.trim()) {
        setUnlockingInvite(true)
        try {
          const config = await decodeDeviceInvite(material, code)
          if (!config) {
            pairFailCount.current += 1
            const delay = Math.min(4000, 400 * 2 ** (pairFailCount.current - 1))
            await new Promise((r) => setTimeout(r, delay))
            setLocalError('Wrong pairing code, or invite is corrupted.')
            return false
          }
          pairFailCount.current = 0
          applyConfig(config)
          return true
        } finally {
          setUnlockingInvite(false)
        }
      }

      setLocalError(
        'Couldn’t read that invite. Scan again or paste the invite link.',
      )
      return false
    },
    [applyConfig, legacyWarning],
  )

  const beginInviteRef = useRef(beginInvite)
  useEffect(() => {
    beginInviteRef.current = beginInvite
  }, [beginInvite])
  useEffect(() => {
    const fromHash = consumeInviteHashFromLocation()
    if (fromHash) void beginInviteRef.current(fromHash)
  }, [])

  const onScanned = useCallback(
    (text: string) => {
      void beginInvite(text)
    },
    [beginInvite],
  )

  const testConnection = async () => {
    setTestMsg(null)
    setTestOk(null)
    setLocalError(null)
    const result = await testGitHubConnection(githubConfig())
    setTestMsg(result.message)
    setTestOk(result.ok)
    if (!result.ok) setLocalError(result.message)
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
    if (step === 1) {
      void goToPasswordStep(githubConfig())
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
    if (!joiningExisting && password !== confirm) {
      setLocalError('Passwords do not match.')
      return
    }
    try {
      await completeSetup({
        github: githubConfig(),
        password,
      })
    } catch {
      /* store sets error */
    }
  }

  const onUnlockInvite = (e: FormEvent) => {
    e.preventDefault()
    if (!pendingInvite) return
    void beginInvite(pendingInvite, pairingCode)
  }

  const tagline =
    mode === 'choose'
      ? 'Join with a partner invite, or set up sync yourself.'
      : mode === 'pair'
        ? 'Enter the pairing code shown next to your partner’s QR.'
        : fromInvite && probing
          ? 'Invite unlocked — checking the vault…'
          : fromInvite && step !== 2
            ? 'Couldn’t reach the vault for this invite.'
            : joiningExisting
              ? 'Vault found — enter the shared master password.'
              : fromInvite
                ? 'Invite applied — enter the shared master password.'
                : 'Connect your private vault, then set a master password.'

  return (
    <AuthShell tagline={tagline}>
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
                  clearPendingInviteHash()
                  setPendingInvite(null)
                  setFromInvite(false)
                  setJoiningExisting(false)
                  setLegacyWarning(null)
                  setMode('manual')
                  setStep(0)
                }}
              >
                Manual Set Up
              </Button>
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="invite-paste">Or paste invite link</Label>
                <Input
                  id="invite-paste"
                  value={invitePaste}
                  onChange={(e) => setInvitePaste(e.target.value)}
                  placeholder="https://…/#i=TANDEM2.…"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={!invitePaste.trim() || unlockingInvite || probing}
                  onClick={() => void beginInvite(invitePaste)}
                >
                  {unlockingInvite || probing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Working…
                    </>
                  ) : (
                    'Continue with invite'
                  )}
                </Button>
              </div>
            </div>
          )}

          {mode === 'scan' && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Scan invite
              </h2>
              <p className="text-sm text-stone-700 dark:text-stone-400">
                Point at the QR from Settings → Add a device. You’ll enter the
                pairing code next. Phone camera opening the link also works.
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

          {mode === 'pair' && (
            <form onSubmit={onUnlockInvite} className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Pairing code
              </h2>
              <p className="text-sm text-stone-700 dark:text-stone-400">
                Ask your partner for the pairing code shown next to the QR (not
                in the QR itself).
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="pair-code">Code</Label>
                <Input
                  id="pair-code"
                  autoFocus
                  autoComplete="one-time-code"
                  value={pairingCode}
                  onChange={(e) =>
                    setPairingCode(formatPairingCode(e.target.value))
                  }
                  placeholder="ABCD-EFGH-IJ"
                  className="font-mono tracking-[0.15em]"
                  maxLength={14}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  unlockingInvite ||
                  normalizePairingCode(pairingCode).length < 8
                }
              >
                {unlockingInvite ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Unlocking invite…
                  </>
                ) : (
                  'Unlock invite'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={resetToChoose}
              >
                Start over
              </Button>
            </form>
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

              {/* Invite path: never show GitHub/token fields — probe then password. */}
              {fromInvite && step !== 2 && (
                <div className="space-y-4">
                  {probing ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-stone-700 dark:text-stone-300">
                      <Loader2 className="h-6 w-6 animate-spin text-teal-800" />
                      <p className="text-sm">Checking vault…</p>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                        Couldn’t connect
                      </h2>
                      <p className="text-sm text-stone-700 dark:text-stone-400">
                        Invite unlocked, but GitHub didn’t accept the vault
                        connection. Start over or ask your partner for a fresh
                        invite.
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={resetToChoose}
                      >
                        Start over
                      </Button>
                    </>
                  )}
                </div>
              )}

              {!fromInvite && step === 0 && (
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

              {!fromInvite && step === 1 && (
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
                  <p className="text-sm text-stone-700 dark:text-stone-400">
                    Continue verifies the token can reach this repo. You can’t
                    set a password until that works.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={probing}
                      onClick={() => void testConnection()}
                    >
                      Test connection
                    </Button>
                    {testMsg && testOk === true && (
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
                  {joiningExisting ? (
                    <p className="text-sm text-stone-700 dark:text-stone-400">
                      {fromInvite
                        ? 'An encrypted vault is already there — enter the same password your household already uses.'
                        : `Connected to ${username}/${repo}. An encrypted vault is already there — enter the same password your household already uses.`}
                    </p>
                  ) : (
                    <p className="text-sm text-stone-700 dark:text-stone-400">
                      No vault on this repo yet. Choose a master password (shared
                      with your partner). Never leaves this browser. Household
                      details can be set later in Settings.
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="pw">Password</Label>
                    <Input
                      id="pw"
                      type="password"
                      autoFocus
                      autoComplete={
                        joiningExisting ? 'current-password' : 'new-password'
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {!joiningExisting && (
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
                        {joiningExisting ? 'Unlocking…' : 'Creating vault…'}
                      </>
                    ) : joiningExisting ? (
                      'Unlock vault'
                    ) : (
                      'Create encrypted vault'
                    )}
                  </Button>
                </form>
              )}

              {!fromInvite && step < 2 && (
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
                  <Button
                    type="button"
                    className="group"
                    disabled={probing}
                    onClick={next}
                  >
                    {probing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {step === 1 ? 'Verifying GitHub…' : 'Checking vault…'}
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4 group-hover:hidden" />
                        <Check className="hidden h-4 w-4 group-hover:block" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {step === 2 && fromInvite && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={resetToChoose}
                >
                  Start over
                </Button>
              )}
            </>
          )}

          {(localError || error) && (
            <p
              className="mt-4 text-sm text-red-700 dark:text-red-400"
              role="alert"
            >
              {localError || error}
            </p>
          )}
        </div>
    </AuthShell>
  )
}
