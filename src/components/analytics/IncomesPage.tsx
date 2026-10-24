import { useMemo, useState } from 'react'
import {
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
import { AnalyticsEmpty } from '@/components/analytics/AnalyticsEmpty'
import { AnalyticsPageHeader } from '@/components/analytics/AnalyticsPageHeader'
import { tipStyle } from '@/components/analytics/chart-theme'
import { MetricStrip } from '@/components/analytics/MetricStrip'
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
  const state = useTandemStore((s) => s.state)!
  const openWizard = useTandemStore((s) => s.openWizard)
  const [range, setRange] = useState<AnalyticsRange>('6M')
  const money = formatMoney
  const { partnerAName, partnerBName } = state.settings

  const records = useMemo(
    () => sliceHistory(state.history, range),
    [state.history, range],
  )
  const rows = useMemo(() => incomeMonths(records), [records])
  const summary = useMemo(() => summarizeIncomes(rows), [rows])

  const share = summary
    ? [
        { name: partnerAName, value: summary.partnerA },
        { name: partnerBName, value: summary.partnerB },
        { name: 'Other', value: summary.other },
      ].filter((s) => s.value > 0)
    : []

  return (
    <div className="animate-[fadeUp_0.4s_ease-out]">
      <AnalyticsPageHeader
        title="Incomes"
        subtitle="Salary and other inflows only — no expenses"
        range={range}
        onRangeChange={setRange}
      />

      <div className="space-y-6">
        {rows.length === 0 || !summary ? (
          <AnalyticsEmpty blurb="No months yet. Track incomes (or load H1 samples) to see the breakdown." />
        ) : (
          <>
            <MetricStrip
              items={[
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
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={56} />
                    <Tooltip
                      contentStyle={tipStyle}
                      formatter={(v) => money(Number(v))}
                    />
                    <Legend />
                    <Bar
                      dataKey="partnerA"
                      name={partnerAName}
                      stackId="in"
                      fill={SOURCE.partnerA}
                    />
                    <Bar
                      dataKey="partnerB"
                      name={partnerBName}
                      stackId="in"
                      fill={SOURCE.partnerB}
                    />
                    <Bar
                      dataKey="other"
                      name="Other"
                      stackId="in"
                      fill={SOURCE.other}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
              <Card>
                <CardTitle>Share of range</CardTitle>
                <div className="mt-2 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={share}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={70}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {share.map((s) => (
                          <Cell
                            key={s.name}
                            fill={
                              s.name === partnerAName
                                ? SOURCE.partnerA
                                : s.name === partnerBName
                                  ? SOURCE.partnerB
                                  : SOURCE.other
                            }
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
                <p className="text-center text-sm font-medium tabular-nums">
                  {money(summary.total)} total
                </p>
              </Card>

              <div className="overflow-x-auto border-t border-stone-300 pt-3 dark:border-stone-700">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="text-xs tracking-wide text-stone-500 uppercase">
                      <th className="py-2 font-medium">Month</th>
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
                        <td className="py-2 text-stone-800 dark:text-stone-200">
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
                            onClick={() =>
                              openWizard(
                                draftForMonth(
                                  state.history,
                                  r.monthKey,
                                  state.settings.categories,
                                ),
                              )
                            }
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-stone-300 font-medium dark:border-stone-600">
                      <td className="py-2">Average</td>
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
            </div>
          </>
        )}
      </div>
    </div>
  )
}
