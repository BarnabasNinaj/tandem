import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'

const REGION_ID = 'tandem-qr-reader'

export function QrScanner({
  onScan,
  onCancel,
}: {
  onScan: (text: string) => void
  onCancel: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const handled = useRef(false)

  useEffect(() => {
    const scanner = new Html5Qrcode(REGION_ID)
    scannerRef.current = scanner
    handled.current = false

    void scanner
      .start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (handled.current) return
          handled.current = true
          void scanner
            .stop()
            .catch(() => undefined)
            .finally(() => onScan(decoded))
        },
        () => undefined,
      )
      .catch(() => {
        setError(
          'Camera unavailable. Allow camera access, or use Manual Set Up.',
        )
      })

    return () => {
      const s = scannerRef.current
      scannerRef.current = null
      if (s?.isScanning) {
        void s.stop().catch(() => undefined)
      }
    }
  }, [onScan])

  return (
    <div className="space-y-3">
      <div
        id={REGION_ID}
        className="overflow-hidden rounded-xl border border-stone-300 dark:border-stone-600"
      />
      {error && (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel scan
      </Button>
    </div>
  )
}
