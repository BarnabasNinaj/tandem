import { useEffect, useState } from 'react'
import { ArrowRight, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageShell } from '@/components/layout/PageShell'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { MonthEditor } from '@/components/track/MonthEditor'
import { Button } from '@/components/ui/button'
import {
  formatDateDDMMYYYY,
  formatMonthKey,
  formatMonthName,
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

  const [resumeDraft, setResumeDraft] = useState<WizardDraft | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

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
    <PageShell
      className="pb-4"
      bodyClassName="space-y-10"
      header={
        <PageHeader
          title="Track"
          subtitle="Log this month’s incomes and card spend. Saved months show up on Home, History, and Outlook."
        />
      }
    >
      {resumeDraft && (
        <section className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 dark:border-teal-900 dark:bg-teal-950/40">
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

      <section>
        <div className="flex flex-col gap-4 border-t border-stone-300 pt-6 dark:border-stone-700 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionHeading title="This calendar month" />
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl">
              {formatMonthName(currentKey)}
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

      <section>
        <SectionHeading title="Tracked months" />
        {months.length === 0 ? (
          <p className="mt-4 border-t border-stone-300 pt-6 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-400">
            No months yet. Track {formatMonthKey(currentKey)}, or load 2026 samples
            to explore the rest of the app.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-300 border-t border-stone-300 dark:divide-stone-700 dark:border-stone-700">
            {months.map((record) => {
              const busy = deletingKey === record.monthKey || syncing
              const leftNegative = record.computed.leftoverAfterExpenses < 0
              return (
                <li
                  key={record.monthKey}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 py-3 sm:flex sm:gap-4 sm:py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2 sm:flex-1 sm:gap-3">
                    <span
                      className={cn(
                        'font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight',
                        record.monthKey === currentKey
                          ? 'text-teal-800 dark:text-teal-300'
                          : 'text-stone-900 dark:text-stone-50',
                      )}
                    >
                      {formatMonthName(record.monthKey)}
                    </span>
                    <span className="hidden min-w-0 truncate text-xs text-stone-600 sm:inline dark:text-stone-400">
                      {formatDateDDMMYYYY(record.updatedAt)}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5 sm:order-last">
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

                  <div className="col-span-2 grid grid-cols-3 gap-2 text-sm tabular-nums sm:col-span-1 sm:flex sm:w-auto sm:shrink-0 sm:gap-5">
                    <span className="flex min-w-0 flex-col items-start text-left sm:w-24">
                      <span className="text-[10px] font-medium tracking-wide text-stone-600 uppercase dark:text-stone-400">
                        In
                      </span>
                      <span className="truncate font-normal text-stone-700 dark:text-stone-300">
                        {money(record.computed.totalInflow)}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col items-start text-left sm:w-24">
                      <span className="text-[10px] font-medium tracking-wide text-stone-600 uppercase dark:text-stone-400">
                        Out
                      </span>
                      <span className="truncate font-normal text-stone-700 dark:text-stone-300">
                        {money(record.computed.totalOutflow)}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col items-start text-left sm:w-24">
                      <span className="text-[10px] font-medium tracking-wide text-stone-600 uppercase dark:text-stone-400">
                        Left
                      </span>
                      <span
                        className={cn(
                          'truncate font-normal',
                          leftNegative
                            ? 'text-orange-800 dark:text-orange-300'
                            : 'text-stone-700 dark:text-stone-300',
                        )}
                      >
                        {money(record.computed.leftoverAfterExpenses)}
                      </span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </PageShell>
  )
}
