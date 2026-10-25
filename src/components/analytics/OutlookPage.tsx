import { useMemo, useState } from 'react'
import { AnalyticsEmpty } from '@/components/analytics/AnalyticsEmpty'
import { AnalyticsPageHeader } from '@/components/analytics/AnalyticsPageHeader'
import { CAT_COLORS } from '@/components/analytics/chart-theme'
import { MetricStrip } from '@/components/analytics/MetricStrip'
import {
  type AnalyticsRange,
  buildMonthOutlook,
  categoryStats,
  sliceHistory,
} from '@/lib/analytics'
import { formatMoney } from '@/lib/number'
import { cn } from '@/lib/utils'
import { useTandemStore } from '@/store/tandem-store'

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

export function OutlookPage() {
  const state = useTandemStore((s) => s.state)!
  const [range, setRange] = useState<AnalyticsRange>('6M')
  const money = formatMoney

  const records = useMemo(
    () => sliceHistory(state.history, range),
    [state.history, range],
  )

  const outlook = useMemo(
    () => buildMonthOutlook(records, { projectMonths: 3 }),
    [records],
  )

  const cats = useMemo(() => categoryStats(records), [records])

  return (
    <div className="animate-[fadeUp_0.4s_ease-out]">
      <AnalyticsPageHeader
        title="Outlook"
        subtitle="Averages from recent months → a simple plan for the next few"
        range={range}
        onRangeChange={setRange}
      />

      <div className="space-y-6">
      {records.length === 0 ? (
        <AnalyticsEmpty blurb="No months yet. Track a month (or load H1 samples) to build averages and forward projections." />
      ) : (
        <>
          {outlook && (
            <section className="space-y-3">
              <div>
                <p className="text-xs font-medium tracking-[0.18em] text-stone-700 dark:text-stone-400 uppercase">
                  Looking ahead
                </p>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                  Trailing average from the last {outlook.sampleSize} month
                  {outlook.sampleSize === 1 ? '' : 's'}
                  {outlook.focusRecorded
                    ? ` · ${outlook.focusLabel} is already tracked`
                    : ` · plan ${outlook.focusLabel} against this baseline`}
                </p>
              </div>
              <MetricStrip
                items={[
                  {
                    label: 'Income',
                    value: money(outlook.avgIncome),
                    hint:
                      outlook.focusIncomeDelta !== null
                        ? deltaLabel(outlook.focusIncomeDelta)
                        : `next ${money(outlook.projected[0]?.income ?? 0)}`,
                  },
                  {
                    label: 'Expenses',
                    value: money(outlook.avgExpense),
                    hint:
                      outlook.focusExpenseDelta !== null
                        ? deltaLabel(outlook.focusExpenseDelta)
                        : `next ${money(outlook.projected[0]?.expense ?? 0)}`,
                  },
                  {
                    label: 'Pocket',
                    value: money(outlook.avgPocket),
                    hint: outlook.projected[0]?.label,
                  },
                  {
                    label: 'Savings',
                    value: `${outlook.avgSavingsRate}%`,
                    hint: `after expenses ${money(outlook.avgLeftover)}`,
                  },
                ]}
              />
              <div className="overflow-x-auto border-t border-stone-300 pt-3 dark:border-stone-700">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="text-xs tracking-wide text-stone-600 uppercase dark:text-stone-400">
                      <th className="py-1.5 font-medium">Projected month</th>
                      <th className="py-1.5 font-medium text-right">Income</th>
                      <th className="py-1.5 font-medium text-right">
                        Expenses
                      </th>
                      <th className="py-1.5 font-medium text-right">Pocket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outlook.projected.map((p) => (
                      <tr
                        key={p.monthKey}
                        className="border-t border-stone-200 dark:border-stone-800"
                      >
                        <td className="py-2 text-stone-800 dark:text-stone-200">
                          {p.label}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {money(p.income)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {money(p.expense)}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium">
                          {money(p.pocket)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <p className="text-xs font-medium tracking-[0.18em] text-stone-700 dark:text-stone-400 uppercase">
              Category baselines
            </p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Average spend per month in this range. Trend is a rough €/month
              slope — e.g. rising about €20/mo means groceries creep up.
            </p>
            <div className="mt-4 overflow-x-auto border-t border-stone-300 pt-2 dark:border-stone-700">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="text-xs tracking-wide text-stone-600 uppercase dark:text-stone-400">
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium text-right">Average</th>
                    <th className="pb-2 font-medium text-right">Last</th>
                    <th className="pb-2 font-medium text-right">Trend</th>
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
                        <td className="py-2.5">
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
                        <td className="py-2.5 text-right tabular-nums font-medium">
                          {money(c.average)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-stone-600 dark:text-stone-400">
                          {money(c.lastAmount)}
                        </td>
                        <td
                          className={cn(
                            'py-2.5 text-right text-xs font-medium tabular-nums',
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
      </div>
    </div>
  )
}
