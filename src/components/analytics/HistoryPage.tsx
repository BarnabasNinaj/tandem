import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AnalyticsEmpty } from '@/components/analytics/AnalyticsEmpty'
import { AnalyticsPageHeader } from '@/components/analytics/AnalyticsPageHeader'
import {
  CAT_COLORS,
  CHART,
  tipStyle,
} from '@/components/analytics/chart-theme'
import { Card, CardTitle } from '@/components/ui/card'
import { formatChartMonth } from '@/lib/dates'
import {
  type AnalyticsRange,
  categoryStats,
  categoryTrendSeries,
  incomeExpenseWithProjection,
  netWorthWithProjection,
  sliceHistory,
} from '@/lib/analytics'
import { netWorthFromSnapshot } from '@/lib/finance'
import { formatMoney } from '@/lib/number'
import { useTandemStore } from '@/store/tandem-store'

export function HistoryPage() {
  const state = useTandemStore((s) => s.state)!
  const [range, setRange] = useState<AnalyticsRange>('6M')
  const money = formatMoney

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

  const nwSeries = useMemo(
    () =>
      netWorthWithProjection(records, (r) =>
        netWorthFromSnapshot(r.portfolioSnapshot),
      ),
    [records],
  )

  const categoryTotals = useMemo(
    () =>
      cats.map((c) => ({
        name: c.categoryName,
        value: c.total,
      })),
    [cats],
  )

  return (
    <div className="animate-[fadeUp_0.4s_ease-out]">
      <AnalyticsPageHeader
        title="History"
        subtitle="Charts over tracked months, with a light projected continuation"
        range={range}
        onRangeChange={setRange}
      />

      <div className="space-y-6">
      {records.length === 0 ? (
        <AnalyticsEmpty blurb="No months yet. Track a month (or load H1 samples) to see category lines, flow, and net worth." />
      ) : (
        <>
          <Card>
            <CardTitle>Category trends</CardTitle>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Top categories by average spend
            </p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={catSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => formatChartMonth(v)}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={56} />
                  <Tooltip
                    contentStyle={tipStyle}
                    formatter={(v) => money(Number(v))}
                  />
                  <Legend />
                  {topCatNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
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
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Solid green/orange = tracked · sage/sand with dashed outline =
              average projection
            </p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={56} />
                  <Tooltip
                    contentStyle={tipStyle}
                    formatter={(v) =>
                      v == null || Number.isNaN(Number(v))
                        ? '—'
                        : money(Number(v))
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill={CHART.income}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name="Expense"
                    fill={CHART.expense}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="projectedIncome"
                    name="Projected income"
                    fill={CHART.projectedIncome}
                    stroke={CHART.income}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="projectedExpense"
                    name="Projected expense"
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
            <CardTitle>Net worth</CardTitle>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Dashed path assumes what’s left after expenses stays near your
              average
            </p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={nwSeries}>
                  <defs>
                    <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={CHART.netWorth}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART.netWorth}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => formatChartMonth(v)}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={56} />
                  <Tooltip
                    contentStyle={tipStyle}
                    formatter={(v) =>
                      v == null || Number.isNaN(Number(v))
                        ? '—'
                        : money(Number(v))
                    }
                    labelFormatter={(l) => String(l)}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Net worth"
                    stroke={CHART.netWorth}
                    fill="url(#nw)"
                    strokeWidth={2}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    name="Projected"
                    stroke={CHART.projected}
                    fill="transparent"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardTitle>Expense mix</CardTitle>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Total spend by category in this range
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {categoryTotals.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CAT_COLORS[i % CAT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tipStyle}
                      formatter={(v) => money(Number(v))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 self-center">
                {categoryTotals.map((c, i) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: CAT_COLORS[i % CAT_COLORS.length],
                        }}
                      />
                      {c.name}
                    </span>
                    <span className="font-medium tabular-nums">
                      {money(c.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </>
      )}
      </div>
    </div>
  )
}
