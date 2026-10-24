import { RangeToggle } from '@/components/analytics/RangeToggle'
import type { AnalyticsRange } from '@/lib/analytics'

/** Title + range filter; sticks under the app header while scrolling. */
export function AnalyticsPageHeader({
  title,
  subtitle,
  range,
  onRangeChange,
}: {
  title: string
  subtitle: string
  range: AnalyticsRange
  onRangeChange: (r: AnalyticsRange) => void
}) {
  return (
    <div className="sticky top-14 z-30 -mx-4 mb-6 border-b border-stone-300/70 bg-[var(--bg)]/90 px-4 py-3 backdrop-blur-md dark:border-stone-800/70">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-stone-900 dark:text-stone-50 sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm text-stone-700 dark:text-stone-400">{subtitle}</p>
        </div>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>
    </div>
  )
}
