import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { flushCardSheetPending } from '@/lib/card-sheet'
import { toMonthKey } from '@/lib/dates'
import { draftForMonth } from '@/lib/finance'
import { useTandemStore } from '@/store/tandem-store'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const phase = useTandemStore((s) => s.phase)
  const state = useTandemStore((s) => s.state)
  const startTracking = useTandemStore((s) => s.startTracking)
  const push = useTandemStore((s) => s.push)
  const wizardDraft = useTandemStore((s) => s.wizardDraft)
  const saveMonth = useTandemStore((s) => s.saveMonth)

  useEffect(() => {
    if (phase !== 'ready' || !state) return

    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return

      if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (wizardDraft) {
          flushCardSheetPending()
          const latest = useTandemStore.getState().wizardDraft
          if (latest) void saveMonth(latest)
        } else {
          void push()
        }
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        startTracking(
          draftForMonth(
            state.history,
            toMonthKey(),
            state.settings.categories,
          ),
        )
        navigate('/track')
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    phase,
    state,
    startTracking,
    push,
    wizardDraft,
    saveMonth,
    navigate,
  ])
}
