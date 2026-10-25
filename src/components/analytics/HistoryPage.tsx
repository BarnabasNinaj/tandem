import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  CHART,
  tipProps,
} from '@/components/analytics/chart-theme'
import { PieBreakdown } from '@/components/analytics/PieBreakdown'
import { useLegendFilter } from '@/components/analytics/use-legend-filter'
import { Card, CardTitle } from '@/components/ui/card'
import { formatChartMonth } from '@/lib/dates'
import {
  type AnalyticsRange,
  categoryStats,
  categoryTrendSeries,
  incomeExpenseWithProjection,
  sliceHistory,
} from '@/lib/analytics'
import { formatMoney } from '@/lib/number'
import { useTandemStore } from '@/store/tandem-store'

export function HistoryPage() {
  const state = useTandemStore((s) => s.state)!
  const [range, setRange] = useState<AnalyticsRange>('6M')
  const money = formatMoney
  const catLegend = useLegendFilter(range)
  const flowLegend = useLegendFilter(range)
  const mixLegend = useLegendFilter(range)

  const records = useMemo(
    () => sliceHistory(state.history, range),
    [state.history, range],
  )

  const cats = useMemo(() => categoryStats(records), [records])
  const topCatNames = useMemo(
    () => cats.slice(0, 6).map((c) => c.categoryName),
    [cats],
  )
  const catSeries = useMemo(
    () => categoryTrendSeries(records, topCatNames),
    [records, topCatNames],
  )

  const flowSeries = useMemo(
    () => incomeExpenseWithProjection(records, 3),
    [records],
  )

  const mixSlices = useMemo(
    () =>
      cats.map((c, i) => ({
        name: c.categoryName,
        value: c.total,
        color: CAT_COLORS[i % CAT_COLORS.length],
      })),
    [cats],
  )

  return (
    <div className="animate-[fadeUp_0.4s_ease-out]">
      <AnalyticsPageHeader
        title="History"
        subtitle="How income and spend moved over time — dashed lines are a simple continuation"
        range={range}
        onRangeChange={setRange}
      />

      <div className="space-y-6">
      {records.length === 0 ? (
        <AnalyticsEmpty blurb="No months yet. Track a month (or load 2026 samples) to see category lines, flow, and expense mix." />
      ) : (
        <>
          <Card>
            <CardTitle>Category trends</CardTitle>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              Top categories by average spend
            </p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={catSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tick={axisTick}
                    tickFormatter={(v: string) => formatChartMonth(v)}
                  />
                  <YAxis tick={axisTick} width={56} />
                  <Tooltip
                    {...tipProps}
                    formatter={(v) => money(Number(v))}
                  />
                  <Legend {...catLegend.legendProps} />
                  {topCatNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      hide={catLegend.isHidden(name)}
                      stroke={CAT_COLORS[i % CAT_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardTitle>Income vs expense</CardTitle>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              Solid green/orange = tracked · sage/sand with dashed outline =
              average projection
            </p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={axisTick} />
                  <YAxis tick={axisTick} width={56} />
                  <Tooltip
                    {...tipProps}
                    formatter={(v) =>
                      v == null || Number.isNaN(Number(v))
                        ? '—'
                        : money(Number(v))
                    }
                  />
                  <Legend {...flowLegend.legendProps} />
                  <Bar
                    dataKey="income"
                    name="Income"
                    hide={flowLegend.isHidden('income')}
                    fill={CHART.income}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name="Expense"
                    hide={flowLegend.isHidden('expense')}
                    fill={CHART.expense}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="projectedIncome"
                    name="Projected income"
                    hide={flowLegend.isHidden('projectedIncome')}
                    fill={CHART.projectedIncome}
                    stroke={CHART.income}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="projectedExpense"
                    name="Projected expense"
                    hide={flowLegend.isHidden('projectedExpense')}
                    fill={CHART.projectedExpense}
                    stroke={CHART.expense}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    radius={[4, 4, 0, 0]}
                  />
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
        </>
      )}
      </div>
    </div>
  )
}
