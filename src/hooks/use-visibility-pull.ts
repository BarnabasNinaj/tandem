import { useEffect, useRef } from 'react'
import { useTandemStore } from '@/store/tandem-store'

/** Minimum gap between quiet focus/visibility pulls (ms). */
const COOLDOWN_MS = 15_000

/**
 * When the tab becomes visible again, quietly pull if there are no unsaved
 * local edits — so a partner’s recent sync shows up without a manual tap.
 */
export function useVisibilityPull() {
  const pull = useTandemStore((s) => s.pull)
  const lastAttempt = useRef(0)

  useEffect(() => {
    const maybePull = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastAttempt.current < COOLDOWN_MS) return
      lastAttempt.current = now
      void pull({ quiet: true })
    }

    document.addEventListener('visibilitychange', maybePull)
    window.addEventListener('focus', maybePull)
    return () => {
      document.removeEventListener('visibilitychange', maybePull)
      window.removeEventListener('focus', maybePull)
    }
  }, [pull])
}
