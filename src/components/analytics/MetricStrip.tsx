import { cn } from '@/lib/utils'

export interface MetricItem {
  label: string
  value: string
  /** Same visual weight as `value` (e.g. savings % beside pocket €). */
  secondary?: string
  hint?: string
}

const valueClass =
  'font-[family-name:var(--font-display)] text-base font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50'

/** Dense label + value band for Outlook / Incomes / Expenses summaries. */
export function MetricStrip({
  items,
  className,
}: {
  items: MetricItem[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline gap-x-5 gap-y-1.5 border-y border-stone-300 py-2 dark:border-stone-700',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 items-baseline gap-1.5"
        >
          <span className="shrink-0 text-[10px] font-medium tracking-wide text-stone-600 uppercase dark:text-stone-400">
            {item.label}
          </span>
          <span className={valueClass}>{item.value}</span>
          {item.secondary ? (
            <>
              <span
                className="text-stone-400 dark:text-stone-500"
                aria-hidden
              >
                /
              </span>
              <span className={valueClass}>{item.secondary}</span>
            </>
          ) : null}
          {item.hint ? (
            <span className="truncate text-[10px] text-stone-600 dark:text-stone-400">
              {item.hint}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
