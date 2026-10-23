import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { formatChartMonth, formatMonthKey } from '@/lib/dates'
import { netWorthFromSnapshot } from '@/lib/finance'
import { formatMoney } from '@/lib/number'
import { useTandemStore } from '@/store/tandem-store'

type Range = '3M' | '6M' | '1Y' | 'All'

const PIE_COLORS = [
  '#0f766e',
  '#115e59',
  '#78716c',
  '#a8a29e',
  '#44403c',
  '#14b8a6',
  '#57534e',
  '#0d9488',
]

export function Analytics() {
  const state = useTandemStore((s) => s.state)!
  const loadDemoData = useTandemStore((s) => s.loadDemoData)
  const syncing = useTandemStore((s) => s.syncing)
  const [range, setRange] = useState<Range>('6M')
  const [loadingDemo, setLoadingDemo] = useState(false)
  const { settings } = state
  const money = (n: number) =>
    formatMoney(n, settings.currencySymbol, settings.currencyLocale)

  const onLoadDemo = async () => {
    setLoadingDemo(true)
    try {
      await loadDemoData()
    } finally {
      setLoadingDemo(false)
    }
  }

  const records = useMemo(() => {
    const all = Object.values(state.history).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey),
    )
    const limit =
      range === '3M' ? 3 : range === '6M' ? 6 : range === '1Y' ? 12 : all.length
    return all.slice(-limit)
  }, [state.history, range])

  const netWorthSeries = records.map((r) => ({
    month: formatMonthKey(r.monthKey),
    key: r.monthKey,
    value: netWorthFromSnapshot(r.portfolioSnapshot),
  }))

  const incomeExpense = records.map((r) => ({
    month: formatMonthKey(r.monthKey),
    income: r.computed.totalInflow,
    expense: r.computed.totalOutflow,
  }))

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) {
      for (const o of r.outflows) {
        map.set(o.categoryName, (map.get(o.categoryName) ?? 0) + o.amount)
      }
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [records])

  const tipStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
  }

  return (
    <div className="space-y-6 animate-[fadeUp_0.4s_ease-out]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-stone-900 dark:text-stone-50">
            Trajectory
          </h1>
          <p className="text-sm text-stone-700 dark:text-stone-400">
            Historical trends · dates as MM/YYYY
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-800">
          {(['3M', '6M', '1Y', 'All'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-50'
                  : 'text-stone-700 dark:text-stone-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {records.length === 0 ? (
        <Card className="space-y-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            No months in your vault yet. Your GitHub vault was created empty —
            sample data is not loaded until you ask for it.
          </p>
          <Button
            type="button"
            disabled={syncing || loadingDemo}
            onClick={() => void onLoadDemo()}
          >
            {loadingDemo || syncing
              ? 'Loading & syncing…'
              : 'Load 2 months of sample data'}
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <CardTitle>Net worth</CardTitle>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netWorthSeries}>
                  <defs>
                    <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
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
                    formatter={(v) => money(Number(v))}
                    labelFormatter={(l) => String(l)}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0f766e"
                    fill="url(#nw)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardTitle>Income vs expense</CardTitle>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeExpense}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={56} />
                  <Tooltip
                    contentStyle={tipStyle}
                    formatter={(v) => money(Number(v))}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#78716c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardTitle>Expense categories</CardTitle>
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
                    >
                      {categoryTotals.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
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
                          background: PIE_COLORS[i % PIE_COLORS.length],
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
  )
}
