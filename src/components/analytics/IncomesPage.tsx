import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AnalyticsEmpty } from '@/components/analytics/AnalyticsEmpty'
import { AnalyticsPageHeader } from '@/components/analytics/AnalyticsPageHeader'
import { PageShell } from '@/components/layout/PageShell'
import {
  axisTick,
  tipProps,
} from '@/components/analytics/chart-theme'
import { PieBreakdown } from '@/components/analytics/PieBreakdown'
import { RangeHero } from '@/components/analytics/RangeHero'
import { useLegendFilter } from '@/components/analytics/use-legend-filter'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import {
  type AnalyticsRange,
  incomeMonths,
  sliceHistory,
  summarizeIncomes,
} from '@/lib/analytics'
import { draftForMonth } from '@/lib/finance'
import { formatMoney } from '@/lib/number'
import { PARTNER_COLOR } from '@/lib/partners'
import { useTandemStore } from '@/store/tandem-store'

const SOURCE = {
  partnerA: PARTNER_COLOR.partnerA,
  partnerB: PARTNER_COLOR.partnerB,
  other: PARTNER_COLOR.other,
} as const

export function IncomesPage() {
  const navigate = useNavigate()
  const state = useTandemStore((s) => s.state)!
  const startTracking = useTandemStore((s) => s.startTracking)
  const [range, setRange] = useState<AnalyticsRange>('6M')
  const money = formatMoney
  const { partnerAName, partnerBName } = state.settings
  const barLegend = useLegendFilter(range)
  const shareLegend = useLegendFilter(range)

  const records = useMemo(
    () => sliceHistory(state.history, range),
    [state.history, range],
  )
  const rows = useMemo(() => incomeMonths(records), [records])
  const summary = useMemo(() => summarizeIncomes(rows), [rows])

  const shareSlices = summary
    ? [
        {
          name: partnerAName,
          value: summary.partnerA,
          color: SOURCE.partnerA,
        },
        {
          name: partnerBName,
          value: summary.partnerB,
          color: SOURCE.partnerB,
        },
        { name: 'Other', value: summary.other, color: SOURCE.other },
      ].filter((s) => s.value > 0)
    : []

  return (
    <PageShell
      bodyClassName="space-y-6"
      header={
        <AnalyticsPageHeader
          title="Incomes"
          subtitle="Who brought money in — partner salaries and Other, no expenses"
          range={range}
          onRangeChange={setRange}
        />
      }
    >
        {rows.length === 0 || !summary ? (
          <AnalyticsEmpty blurb="No months yet. Track incomes (or load 2026 samples) to see the breakdown." />
        ) : (
          <>
            <RangeHero
              metrics={[
                { label: 'Avg / mo', value: money(summary.avgTotal) },
                {
                  label: partnerAName,
                  value: money(summary.avgPartnerA),
                },
                {
                  label: partnerBName,
                  value: money(summary.avgPartnerB),
                },
                { label: 'Other', value: money(summary.avgOther) },
              ]}
            />

            <Card>
              <CardTitle>Income by source</CardTitle>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" tick={axisTick} />
                    <YAxis tick={axisTick} width={56} />
                    <Tooltip
                      {...tipProps}
                      formatter={(v) => money(Number(v))}
                    />
                    <Legend {...barLegend.legendProps} />
                    <Bar
                      dataKey="partnerA"
                      name={partnerAName}
                      hide={barLegend.isHidden('partnerA')}
                      stackId="in"
                      fill={SOURCE.partnerA}
                    />
                    <Bar
                      dataKey="partnerB"
                      name={partnerBName}
                      hide={barLegend.isHidden('partnerB')}
                      stackId="in"
                      fill={SOURCE.partnerB}
                    />
                    <Bar
                      dataKey="other"
                      name="Other"
                      hide={barLegend.isHidden('other')}
                      stackId="in"
                      fill={SOURCE.other}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardTitle>Share of range</CardTitle>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                Who brought money in — click a row to hide or show it on the
                chart
              </p>
              <div className="mt-4">
                <PieBreakdown
                  slices={shareSlices}
                  isHidden={shareLegend.isHidden}
                  onToggle={shareLegend.toggle}
                  formatMoney={money}
                  footer={
                    <p className="text-sm font-medium tabular-nums text-stone-700 dark:text-stone-300">
                      {money(summary.total)} total
                    </p>
                  }
                />
              </div>
            </Card>

            <div className="overflow-x-auto border-t border-stone-300 pt-3 dark:border-stone-700">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="text-xs tracking-wide text-stone-600 uppercase dark:text-stone-400">
                      <th className="analytics-sticky-label py-2 pr-3 font-medium">
                        Month
                      </th>
                      <th
                        className="py-2 font-medium text-right"
                        style={{ color: 'var(--partner-a)' }}
                      >
                        {partnerAName}
                      </th>
                      <th
                        className="py-2 font-medium text-right"
                        style={{ color: 'var(--partner-b)' }}
                      >
                        {partnerBName}
                      </th>
                      <th
                        className="py-2 font-medium text-right"
                        style={{ color: 'var(--partner-other)' }}
                      >
                        Other
                      </th>
                      <th className="py-2 font-medium text-right">Total</th>
                      <th className="py-2 font-medium text-right"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.monthKey}
                        className="border-t border-stone-200 dark:border-stone-800"
                      >
                        <td className="analytics-sticky-label py-2 pr-3 text-stone-800 dark:text-stone-200">
                          {r.label}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {money(r.partnerA)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {money(r.partnerB)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {money(r.other)}
                        </td>
                        <td className="py-2 text-right font-medium tabular-nums">
                          {money(r.total)}
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              startTracking(
                                draftForMonth(
                                  state.history,
                                  r.monthKey,
                                  state.settings.categories,
                                ),
                              )
                              navigate('/track')
                            }}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-stone-300 font-medium dark:border-stone-600">
                      <td className="analytics-sticky-label py-2 pr-3">
                        Average
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {money(summary.avgPartnerA)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {money(summary.avgPartnerB)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {money(summary.avgOther)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {money(summary.avgTotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
            </div>
          </>
        )}
    </PageShell>
  )
}
