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
import {
  axisTick,
  CAT_COLORS,
  tipProps,
} from '@/components/analytics/chart-theme'
import { MetricStrip } from '@/components/analytics/MetricStrip'
import { PieBreakdown } from '@/components/analytics/PieBreakdown'
import { useLegendFilter } from '@/components/analytics/use-legend-filter'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import {
  type AnalyticsRange,
  expenseGrid,
  sliceHistory,
} from '@/lib/analytics'
import { draftForMonth } from '@/lib/finance'
import { formatMoney, round2 } from '@/lib/number'
import { useTandemStore } from '@/store/tandem-store'

export function ExpensesPage() {
  const navigate = useNavigate()
  const state = useTandemStore((s) => s.state)!
  const startTracking = useTandemStore((s) => s.startTracking)
  const [range, setRange] = useState<AnalyticsRange>('6M')
  const money = formatMoney
  const barLegend = useLegendFilter(range)
  const mixLegend = useLegendFilter(range)

  const records = useMemo(
    () => sliceHistory(state.history, range),
    [state.history, range],
  )
  const grid = useMemo(() => expenseGrid(records), [records])

  const chartRows = useMemo(
    () =>
      grid.rows.map((r) => {
        const row: Record<string, string | number> = {
          label: r.label,
          monthKey: r.monthKey,
        }
        for (const c of grid.categories) {
          row[c.name] = r.byCategory[c.id] ?? 0
        }
        return row
      }),
    [grid],
  )

  const avgTotal =
    grid.rows.length === 0
      ? 0
      : round2(
          grid.rows.reduce((s, r) => s + r.total, 0) / grid.rows.length,
        )
  const rangeTotal = round2(grid.rows.reduce((s, r) => s + r.total, 0))
  const mixSlices = grid.categories.map((c, i) => ({
    name: c.name,
    value: c.total,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }))

  return (
    <div className="animate-[fadeUp_0.4s_ease-out]">
      <AnalyticsPageHeader
        title="Expenses"
        subtitle="Where the money went by category — groceries, rent, and the rest"
        range={range}
        onRangeChange={setRange}
      />

      <div className="space-y-6">
        {grid.rows.length === 0 ? (
          <AnalyticsEmpty blurb="No months yet. Track expenses (or load H1 samples) to see the breakdown." />
        ) : (
          <>
            <MetricStrip
              items={[
                { label: 'Avg / mo', value: money(avgTotal) },
                { label: 'Range total', value: money(rangeTotal) },
                {
                  label: grid.categories[0]
                    ? `Largest · ${grid.categories[0].name}`
                    : 'Largest',
                  value: grid.categories[0]
                    ? money(grid.categories[0].total)
                    : '—',
                },
              ]}
            />

            <Card>
              <CardTitle>Spend by category</CardTitle>
              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" tick={axisTick} />
                    <YAxis tick={axisTick} width={56} />
                    <Tooltip
                      {...tipProps}
                      formatter={(v) => money(Number(v))}
                    />
                    <Legend {...barLegend.legendProps} />
                    {grid.categories.map((c, i) => (
                      <Bar
                        key={c.id}
                        dataKey={c.name}
                        hide={barLegend.isHidden(c.name)}
                        stackId="out"
                        fill={CAT_COLORS[i % CAT_COLORS.length]}
                        radius={
                          i === grid.categories.length - 1
                            ? [4, 4, 0, 0]
                            : undefined
                        }
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardTitle>Expense mix</CardTitle>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                Share of total spend in this range — click a row to hide or show
                it on the chart
              </p>
              <div className="mt-4">
                <PieBreakdown
                  slices={mixSlices}
                  isHidden={mixLegend.isHidden}
                  onToggle={mixLegend.toggle}
                  formatMoney={money}
                />
              </div>
            </Card>

            <div className="overflow-x-auto border-t border-stone-300 pt-3 dark:border-stone-700">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="text-xs tracking-wide text-stone-600 uppercase dark:text-stone-400">
                    <th className="py-2 pr-3 font-medium">Category</th>
                    {grid.rows.map((r) => (
                      <th
                        key={r.monthKey}
                        className="py-2 pr-3 font-medium text-right whitespace-nowrap"
                      >
                        {r.label}
                      </th>
                    ))}
                    <th className="py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {grid.categories.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-stone-200 dark:border-stone-800"
                    >
                      <td className="py-2 pr-3 whitespace-nowrap text-stone-800 dark:text-stone-200">
                        {c.name}
                      </td>
                      {grid.rows.map((r) => (
                        <td
                          key={r.monthKey}
                          className="py-2 pr-3 text-right tabular-nums"
                        >
                          {money(r.byCategory[c.id] ?? 0)}
                        </td>
                      ))}
                      <td className="py-2 text-right font-medium tabular-nums">
                        {money(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-stone-300 font-medium dark:border-stone-600">
                    <td className="py-2 pr-3">Total</td>
                    {grid.rows.map((r) => (
                      <td
                        key={r.monthKey}
                        className="py-2 pr-3 text-right tabular-nums"
                      >
                        {money(r.total)}
                      </td>
                    ))}
                    <td className="py-2 text-right tabular-nums">
                      {money(rangeTotal)}
                    </td>
                  </tr>
                  <tr className="border-t border-stone-200 dark:border-stone-800">
                    <td className="py-2 pr-3" />
                    {grid.rows.map((r) => (
                      <td key={r.monthKey} className="py-2 pr-3 text-right">
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
                    ))}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
