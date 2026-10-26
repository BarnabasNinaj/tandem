import { useMemo, useState } from 'react'
import { AnalyticsEmpty } from '@/components/analytics/AnalyticsEmpty'
import { AnalyticsPageHeader } from '@/components/analytics/AnalyticsPageHeader'
import { CAT_COLORS } from '@/components/analytics/chart-theme'
import { RangeHero } from '@/components/analytics/RangeHero'
import { PageShell } from '@/components/layout/PageShell'
import {
  MetaLabel,
  SectionHeading,
} from '@/components/layout/SectionHeading'
import {
  type AnalyticsRange,
  buildMonthOutlook,
  categoryStats,
  sliceHistory,
} from '@/lib/analytics'
import { formatMonthKey } from '@/lib/dates'
import { formatMoney, netCaption, round2 } from '@/lib/number'
import { cn } from '@/lib/utils'
import { useTandemStore } from '@/store/tandem-store'
import type { MonthlyRecord } from '@/types/tandem'

function deltaLabel(delta: number | null): string {
  if (delta === null) return '—'
  if (delta === 0) return 'on average'
  const sign = delta > 0 ? '+' : '−'
  return `${sign}${formatMoney(Math.abs(delta))} vs avg`
}

function trendWord(slope: number): { label: string; className: string } {
  if (slope > 5)
    return {
      label: 'rising',
      className: 'text-orange-700 dark:text-orange-300',
    }
  if (slope < -5)
    return {
      label: 'falling',
      className: 'text-teal-800 dark:text-teal-300',
    }
  return {
    label: 'steady',
    className: 'text-stone-600 dark:text-stone-400',
  }
}

/** Compact leftover bars — amounts live in the title tooltip. */
function MonthPocketBars({ records }: { records: MonthlyRecord[] }) {
  if (records.length === 0) return null

  const values = records.map((r) => r.computed.discretionarySurplus)
  const peak = Math.max(...values.map((v) => Math.abs(v)), 1)
  const maxBarPx = 52

  return (
    <div
      className="flex min-w-0 flex-1 items-end gap-1 sm:max-w-md sm:gap-1.5"
      role="img"
      aria-label="Net by month in this range"
    >
      {records.map((r, i) => {
        const v = values[i]!
        const barPx = Math.max(6, Math.round((Math.abs(v) / peak) * maxBarPx))
        const short = formatMonthKey(r.monthKey).slice(0, 2)
        return (
          <div
            key={r.monthKey}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
            title={`${formatMonthKey(r.monthKey)}: ${formatMoney(v)}`}
          >
            <div
              className={cn(
                'w-full max-w-[2.25rem] rounded-t-sm',
                v < 0
                  ? 'bg-orange-600/80 dark:bg-orange-400/70'
                  : 'bg-[var(--logo)]',
              )}
              style={{ height: barPx }}
            />
            <span className="text-[9px] font-medium tracking-wide text-stone-500 uppercase dark:text-stone-500">
              {short}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function AheadMetric({
  label,
  value,
  secondary,
  hint,
  accent,
}: {
  label: string
  value: string
  secondary?: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'min-w-0 border-t-2 pt-3.5',
        accent
          ? 'border-[var(--logo)]'
          : 'border-stone-300 dark:border-stone-600',
      )}
    >
      <MetaLabel>{label}</MetaLabel>
      <p
        className={cn(
          'mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums tracking-tight sm:text-2xl',
          accent
            ? 'text-[var(--logo)]'
            : 'text-stone-900 dark:text-stone-50',
        )}
      >
        {value}
        {secondary ? (
          <span className="text-base font-semibold text-stone-500 dark:text-stone-400 sm:text-lg">
            {' '}
            / {secondary}
          </span>
        ) : null}
      </p>
      {hint ? (
        <p className="mt-1.5 truncate text-xs leading-relaxed text-stone-600 dark:text-stone-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function OutlookPage() {
  const state = useTandemStore((s) => s.state)!
  const [range, setRange] = useState<AnalyticsRange>('6M')
  const money = formatMoney

  const records = useMemo(
    () => sliceHistory(state.history, range),
    [state.history, range],
  )

  const outlook = useMemo(() => buildMonthOutlook(records), [records])

  const cats = useMemo(() => categoryStats(records), [records])

  const avgExpenseShare =
    outlook && outlook.avgIncome > 0
      ? round2((outlook.avgExpense / outlook.avgIncome) * 100)
      : 0

  return (
    <PageShell
      bodyClassName="space-y-8"
      header={
        <AnalyticsPageHeader
          title="Outlook"
          subtitle="What the months kept → what the next ones look like"
          range={range}
          onRangeChange={setRange}
        />
      }
    >
        {records.length === 0 ? (
          <AnalyticsEmpty blurb="No months yet. Track a month (or load 2026 samples) to build averages and forward projections." />
        ) : (
          <>
            {outlook && (
              <>
                <RangeHero>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                    <div className="min-w-0 shrink-0">
                      <p
                        className={cn(
                          'font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl',
                          outlook.totalPocket < 0
                            ? 'text-orange-800 dark:text-orange-300'
                            : 'text-stone-900 dark:text-stone-50',
                        )}
                      >
                        {money(outlook.totalPocket)}
                      </p>
                      <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                        Net · {outlook.sampleSize} mo ·{' '}
                        {money(outlook.avgPocket)}/mo
                        <span className="text-stone-500">
                          {' '}
                          ·{' '}
                          {outlook.sampleSize === 1
                            ? netCaption(outlook.totalPocket)
                            : outlook.totalPocket < 0
                              ? 'short across these months'
                              : 'left after expenses'}
                        </span>
                      </p>
                    </div>
                    <MonthPocketBars records={records} />
                  </div>
                </RangeHero>

                <section className="space-y-6 animate-[fadeUp_0.5s_ease-out]">
                  <SectionHeading
                    className="pr-1"
                    title="Looking ahead"
                    subtitle={
                      <>
                        Baseline from the last {outlook.sampleSize} month
                        {outlook.sampleSize === 1 ? '' : 's'}
                        {outlook.focusRecorded
                          ? ` · ${outlook.focusLabel} is already tracked`
                          : ` · plan ${outlook.focusLabel} against this`}
                      </>
                    }
                  />

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
                    <AheadMetric
                      label="Income"
                      value={money(outlook.avgIncome)}
                      hint={
                        outlook.focusIncomeDelta !== null
                          ? deltaLabel(outlook.focusIncomeDelta)
                          : 'monthly average'
                      }
                    />
                    <AheadMetric
                      label="Expenses"
                      value={money(outlook.avgExpense)}
                      secondary={`${avgExpenseShare}%`}
                      hint={
                        outlook.focusExpenseDelta !== null
                          ? deltaLabel(outlook.focusExpenseDelta)
                          : 'of income'
                      }
                    />
                    <AheadMetric
                      label="Net"
                      value={money(outlook.avgPocket)}
                      secondary={`${outlook.avgSavingsRate}%`}
                      hint="of income"
                      accent
                    />
                  </div>
                </section>
              </>
            )}

            <section>
              <SectionHeading
                title="Category baselines"
                subtitle="Average spend per month in this range. Trend is a rough €/month slope — e.g. rising about €20/mo means groceries creep up."
              />
              <div className="mt-4 overflow-x-auto border-t border-stone-300 pt-3 dark:border-stone-700">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="text-xs tracking-wide text-stone-600 uppercase dark:text-stone-400">
                      <th className="analytics-sticky-label pb-2.5 pr-4 font-medium">
                        Category
                      </th>
                      <th className="px-3 pb-2.5 font-medium text-right">
                        Average
                      </th>
                      <th className="px-3 pb-2.5 font-medium text-right">
                        Last
                      </th>
                      <th className="pb-2.5 pl-3 font-medium text-right">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map((c, i) => {
                      const t = trendWord(c.slope)
                      return (
                        <tr
                          key={c.categoryId}
                          className="border-t border-stone-200 dark:border-stone-800"
                        >
                          <td className="analytics-sticky-label py-2.5 pr-4">
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                  background: CAT_COLORS[i % CAT_COLORS.length],
                                }}
                              />
                              {c.categoryName}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                            {money(c.average)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-stone-600 dark:text-stone-400">
                            {money(c.lastAmount)}
                          </td>
                          <td
                            className={cn(
                              'py-2.5 pl-3 text-right text-xs font-medium tabular-nums',
                              t.className,
                            )}
                          >
                            {t.label}
                            {c.slope !== 0
                              ? ` · ${c.slope > 0 ? '+' : ''}${money(c.slope)}/mo`
                              : ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
    </PageShell>
  )
}
