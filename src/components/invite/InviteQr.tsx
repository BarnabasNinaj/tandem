import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { encodeDeviceInvite } from '@/lib/device-invite'
import type { GitHubConfig } from '@/types/tandem'

export function InviteQr({ config }: { config: GitHubConfig }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const invite = encodeDeviceInvite(config)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void QRCode.toDataURL(invite, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#1c1917', light: '#ffffff' },
    }).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [invite, open])

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

  return (
    <Card className="space-y-3">
      <CardTitle className="flex items-center gap-2">
        <QrCode className="h-4 w-4" />
        Add a device
      </CardTitle>
      <p className="text-sm text-stone-700 dark:text-stone-400">
        Your partner scans this QR on setup. It shares sync access (username,
        repo, token) — not the master password. Don’t screenshot or leave it on
        screen.
      </p>

      {!open ? (
        <Button type="button" onClick={() => setOpen(true)}>
          Show invite QR
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-center rounded-xl border border-stone-300 bg-white p-4 dark:border-stone-600">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="Tandem device invite QR code"
                className="h-56 w-56"
              />
            ) : (
              <p className="py-20 text-sm text-stone-600">Generating…</p>
            )}
          </div>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Hide QR
          </Button>
        </div>
      )}
    </Card>
  )
}
