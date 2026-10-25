import { useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import {
  createDeviceInvite,
  formatPairingCode,
  type CreatedDeviceInvite,
} from '@/lib/device-invite'
import type { GitHubConfig } from '@/types/tandem'

export function InviteQr({ config }: { config: GitHubConfig }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [invite, setInvite] = useState<CreatedDeviceInvite | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'url' | 'code' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const show = async () => {
    setBusy(true)
    setError(null)
    setInvite(null)
    setDataUrl(null)
    try {
      const created = await createDeviceInvite(config)
      const url = await QRCode.toDataURL(created.url, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#1c1917', light: '#ffffff' },
      })
      setInvite(created)
      setDataUrl(url)
    } catch {
      setError('Couldn’t create invite. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const hide = () => {
    setInvite(null)
    setDataUrl(null)
    setError(null)
    setCopied(null)
  }

  const copy = async (kind: 'url' | 'code') => {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(
        kind === 'url' ? invite.url : invite.code,
      )
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      /* clipboard may be denied */
    }
  }

  if (!config.username || !config.repo || !config.pat) {
    return (
      <Card>
        <CardTitle>Add a device</CardTitle>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-400">
          Save a valid GitHub username, repo, and PAT above first — then you can
          show a QR for your partner.
        </p>
      </Card>
    )
  }

  const open = Boolean(invite || busy || error)

  return (
    <Card className="space-y-3">
      <CardTitle className="flex items-center gap-2">
        <QrCode className="h-4 w-4" />
        Add a device
      </CardTitle>
      <p className="text-sm text-stone-700 dark:text-stone-400">
        QR opens Tandem in the phone browser. Sync credentials are encrypted in
        the link — treat the link as sensitive even without the code. Your
        partner also needs the pairing code on this screen (say it aloud or send
        separately). Don’t screenshot the code with the QR. Hide when done.
      </p>

      {!open ? (
        <Button type="button" onClick={() => void show()}>
          Show invite QR
        </Button>
      ) : (
        <div className="space-y-3">
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-center rounded-xl border border-stone-300 bg-white p-4 dark:border-stone-600">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="Tandem device invite QR code"
                className="h-56 w-56"
              />
            ) : (
              <p className="py-20 text-sm text-stone-600">
                {busy ? 'Generating…' : '…'}
              </p>
            )}
          </div>
          {invite && (
            <div className="rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-center dark:border-stone-600 dark:bg-stone-900/40">
              <p className="text-[10px] font-medium tracking-wide text-stone-600 uppercase dark:text-stone-400">
                Pairing code
              </p>
              <p className="mt-1 font-mono text-2xl tracking-[0.12em] text-stone-950 dark:text-stone-50">
                {formatPairingCode(invite.code)}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!invite}
              onClick={() => void copy('code')}
            >
              {copied === 'code' ? (
                <>
                  <Check className="h-4 w-4" />
                  Code copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy code
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!invite}
              onClick={() => void copy('url')}
            >
              {copied === 'url' ? (
                <>
                  <Check className="h-4 w-4" />
                  Link copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={hide}>
              Hide QR
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
