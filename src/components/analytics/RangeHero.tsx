import type { ReactNode } from 'react'
import {
  MetaLabel,
  SectionHeading,
} from '@/components/layout/SectionHeading'
import { cn } from '@/lib/utils'

export interface RangeMetric {
  label: string
  value: string
  secondary?: string
  hint?: string
}

const valueClass =
  'font-[family-name:var(--font-display)] text-base font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50'

/**
 * Shared “In this range” band — gradient + border-y shell.
 * Pass `metrics` for the Incomes / Expenses compact row (same fields as the
 * old strip), or `children` for a custom body (Outlook Net hero + month bars).
 */
export function RangeHero({
  title = 'In this range',
  metrics,
  children,
  className,
}: {
  title?: ReactNode
  metrics?: RangeMetric[]
  children?: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'relative min-w-0 overflow-hidden border-y border-stone-300 px-4 py-4 dark:border-stone-700 sm:px-5',
        className,
      )}
      style={{
        background:
          'linear-gradient(135deg, color-mix(in oklab, var(--logo) 8%, transparent), transparent 55%)',
      }}
    >
      <SectionHeading title={title} />
      <div className="mt-3 min-w-0">
        {metrics ? (
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-1.5">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="flex min-w-0 items-baseline gap-1.5"
              >
                <MetaLabel as="span" className="shrink-0">
                  {item.label}
                </MetaLabel>
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
        ) : (
          children
        )}
      </div>
    </section>
  )
}
