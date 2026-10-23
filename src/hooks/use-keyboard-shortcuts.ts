import { useEffect } from 'react'
import { toMonthKey } from '@/lib/dates'
import { emptyDraft, getLatestRecord } from '@/lib/finance'
import { useTandemStore } from '@/store/tandem-store'

export function useKeyboardShortcuts() {
  const phase = useTandemStore((s) => s.phase)
  const state = useTandemStore((s) => s.state)
  const openWizard = useTandemStore((s) => s.openWizard)
  const push = useTandemStore((s) => s.push)
  const wizardOpen = useTandemStore((s) => s.wizardOpen)
  const wizardDraft = useTandemStore((s) => s.wizardDraft)
  const saveMonth = useTandemStore((s) => s.saveMonth)

  useEffect(() => {
    if (phase !== 'ready' || !state) return

    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return

      if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (wizardOpen && wizardDraft) {
          void saveMonth(wizardDraft)
        } else {
          void push()
        }
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        const latest = getLatestRecord(state)
        openWizard(emptyDraft(toMonthKey(), state.settings.categories, latest))
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, state, openWizard, push, wizardOpen, wizardDraft, saveMonth])
}
