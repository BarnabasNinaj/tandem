import { useEffect, useRef } from 'react'
import { useTandemStore } from '@/store/tandem-store'

export function useAutoLock() {
  const phase = useTandemStore((s) => s.phase)
  const state = useTandemStore((s) => s.state)
  const lock = useTandemStore((s) => s.lock)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (phase !== 'ready' || !state) return

    const minutes = state.settings.autoLockMinutes || 30
    const ms = minutes * 60 * 1000

    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => lock(), ms)
    }

    const events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'] as const
    for (const ev of events) window.addEventListener(ev, reset, { passive: true })
    reset()

    return () => {
      if (timer.current) clearTimeout(timer.current)
      for (const ev of events) window.removeEventListener(ev, reset)
    }
  }, [phase, state, lock])
}
