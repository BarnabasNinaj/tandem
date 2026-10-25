import { useEffect, useState } from 'react'
import { ArrowRight, Pencil, Trash2 } from 'lucide-react'
import { MonthEditor } from '@/components/track/MonthEditor'
import { Button } from '@/components/ui/button'
import {
  formatDateDDMMYYYY,
  formatMonthKey,
  toMonthKey,
} from '@/lib/dates'
import { draftForMonth, type WizardDraft } from '@/lib/finance'
import { formatMoney } from '@/lib/number'
import { cn } from '@/lib/utils'
import { useTandemStore } from '@/store/tandem-store'

export function TrackPage() {
  const draft = useTandemStore((s) => s.wizardDraft)
  if (draft) return <MonthEditor />
  return <TrackHub />
}

function TrackHub() {
  const state = useTandemStore((s) => s.state)!
  const startTracking = useTandemStore((s) => s.startTracking)
  const deleteMonth = useTandemStore((s) => s.deleteMonth)
  const restoreDraft = useTandemStore((s) => s.restoreDraft)
  const loadDemoData = useTandemStore((s) => s.loadDemoData)
  const syncing = useTandemStore((s) => s.syncing)
  const { settings, history } = state
  const money = formatMoney

  const currentKey = toMonthKey()
  const currentSaved = Boolean(history[currentKey])

  const months = Object.values(history).sort((a, b) =>
    b.monthKey.localeCompare(a.monthKey),
  )

  const [revealed, setRevealed] = useState(false)
  const [resumeDraft, setResumeDraft] = useState<WizardDraft | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const restored = await restoreDraft()
      if (!cancelled && restored) setResumeDraft(restored)
    })()
    return () => {
      cancelled = true
    }
  }, [restoreDraft])

  const openMonth = (monthKey: string) => {
    startTracking(draftForMonth(history, monthKey, settings.categories))
  }

  const onDelete = async (monthKey: string) => {
    const label = formatMonthKey(monthKey)
    if (
      !window.confirm(
        `Delete ${label}? This removes the month from your vault and syncs.`,
      )
    ) {
      return
    }
    setDeletingKey(monthKey)
    try {
      await deleteMonth(monthKey)
      setResumeDraft((d) => (d?.monthKey === monthKey ? null : d))
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <div className="space-y-10 pb-4">
      <header
        className={cn(
          'transition-all duration-700',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        )}
      >
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-stone-900 dark:text-stone-50 sm:text-3xl">
          Track
        </h1>
        <p className="mt-1 max-w-lg text-sm text-stone-700 dark:text-stone-400">
          Enter or edit a month. Review trends in History; plan ahead in Outlook.
        </p>
      </header>

      {resumeDraft && (
        <section
          className={cn(
            'rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 dark:border-teal-900 dark:bg-teal-950/40 transition-all duration-700 delay-75',
            revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-teal-950 dark:text-teal-100">
              Unsaved draft for{' '}
              <span className="font-medium tabular-nums">
                {formatMonthKey(resumeDraft.monthKey)}
              </span>
            </p>
            <Button size="sm" onClick={() => startTracking(resumeDraft)}>
              Resume
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>
      )}

      <section
        className={cn(
          'transition-all duration-700 delay-100',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        )}
      >
        <div className="flex flex-col gap-4 border-t border-stone-300 pt-6 dark:border-stone-700 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-stone-700 uppercase dark:text-stone-400">
              This calendar month
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl">
              {formatMonthKey(currentKey)}
            </p>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              {currentSaved
                ? `Saved · updated ${formatDateDDMMYYYY(history[currentKey]!.updatedAt)}`
                : 'Not tracked yet'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {months.length === 0 && (
              <Button
                variant="secondary"
                disabled={syncing}
                onClick={() => void loadDemoData()}
              >
                Load samples
              </Button>
            )}
            <Button onClick={() => openMonth(currentKey)}>
              {currentSaved ? 'Edit month' : 'Track month'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>

      <section
        className={cn(
          'transition-all duration-700 delay-200',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        )}
      >
        <p className="text-xs font-medium tracking-[0.18em] text-stone-700 uppercase dark:text-stone-400">
          Tracked months
        </p>
        {months.length === 0 ? (
          <p className="mt-4 border-t border-stone-300 pt-6 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-400">
            No months yet. Track {formatMonthKey(currentKey)}, or load H1 samples
            to explore the rest of the app.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-300 border-t border-stone-300 dark:divide-stone-700 dark:border-stone-700">
            {months.map((record) => {
              const busy = deletingKey === record.monthKey || syncing
              return (
                <li
                  key={record.monthKey}
                  className="flex items-center gap-3 py-2.5 sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <span className="shrink-0 font-medium tabular-nums text-stone-900 dark:text-stone-100">
                      {formatMonthKey(record.monthKey)}
                    </span>
                    {record.monthKey === currentKey && (
                      <span className="shrink-0 text-[10px] font-medium tracking-wide text-teal-800 uppercase dark:text-teal-300">
                        current
                      </span>
                    )}
                    <span className="hidden min-w-0 truncate text-xs text-stone-600 sm:inline dark:text-stone-400">
                      {formatDateDDMMYYYY(record.updatedAt)}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-baseline gap-3 text-sm tabular-nums sm:gap-5">
                    <span className="text-stone-800 dark:text-stone-200">
                      <span className="mr-1 text-[10px] font-medium tracking-wide text-stone-600 uppercase dark:text-stone-400">
                        In
                      </span>
                      {money(record.computed.totalInflow)}
                    </span>
                    <span className="text-stone-800 dark:text-stone-200">
                      <span className="mr-1 text-[10px] font-medium tracking-wide text-stone-600 uppercase dark:text-stone-400">
                        Out
                      </span>
                      {money(record.computed.totalOutflow)}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={`Edit ${formatMonthKey(record.monthKey)}`}
                      aria-label={`Edit ${formatMonthKey(record.monthKey)}`}
                      disabled={busy}
                      onClick={() => openMonth(record.monthKey)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-stone-600 hover:text-red-700 dark:text-stone-400 dark:hover:text-red-400"
                      title={`Delete ${formatMonthKey(record.monthKey)}`}
                      aria-label={`Delete ${formatMonthKey(record.monthKey)}`}
                      disabled={busy}
                      onClick={() => void onDelete(record.monthKey)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
