import type { ReactNode } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { tipProps } from '@/components/analytics/chart-theme'
import { cn } from '@/lib/utils'

export type PieSlice = {
  name: string
  value: number
  color: string
}

/** Donut on the left, compact € + % rows on the right (of full total). */
export function PieBreakdown({
  slices,
  isHidden,
  onToggle,
  formatMoney,
  chartClassName = 'h-64',
  footer,
}: {
  slices: PieSlice[]
  isHidden: (name: string) => boolean
  onToggle: (name: string) => void
  formatMoney: (n: number) => string
  chartClassName?: string
  footer?: ReactNode
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const visible = slices.filter((s) => !isHidden(s.name) && s.value > 0)

  const pctOfTotal = (value: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="grid items-center gap-5 sm:grid-cols-[17rem_auto]">
        <div className={cn('mx-auto w-full max-w-[17rem]', chartClassName)}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visible}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
                stroke="none"
              >
                {visible.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                {...tipProps}
                formatter={(v, name) => {
                  const n = Number(v)
                  const pct = pctOfTotal(n)
                  return [`${formatMoney(n)} (${pct}%)`, String(name)]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="w-full max-w-[18rem] min-w-0 space-y-1">
          {slices.map((s) => {
            const dimmed = isHidden(s.name)
            const pct = pctOfTotal(s.value)
            return (
              <li key={s.name}>
                <button
                  type="button"
                  onClick={() => onToggle(s.name)}
                  title={
                    dimmed
                      ? 'Click to show in chart'
                      : 'Click to hide from chart'
                  }
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3 rounded-md px-1 py-0.5 text-left text-sm transition-opacity hover:bg-stone-100 dark:hover:bg-stone-800/80',
                    dimmed && 'opacity-45',
                  )}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span
                      className={cn('truncate', dimmed && 'line-through')}
                    >
                      {s.name}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                    <span className="w-8 text-right text-xs text-stone-600 dark:text-stone-400">
                      {pct}%
                    </span>
                    <span className="min-w-[4.5rem] text-right font-medium">
                      {formatMoney(s.value)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {footer}
    </div>
  )
}
