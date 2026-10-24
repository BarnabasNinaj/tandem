import type { AnalyticsRange } from '@/lib/analytics'

const RANGES: AnalyticsRange[] = ['3M', '6M', '1Y', 'All']

export function RangeToggle({
  value,
  onChange,
}: {
  value: AnalyticsRange
  onChange: (r: AnalyticsRange) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-800">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === r
              ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-50'
              : 'text-stone-700 dark:text-stone-400'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  )
}
