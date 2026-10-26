import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared page title band — same sticky position under the app header for
 * Home, Track, History, Incomes, Expenses, Outlook.
 */
export function PageHeader({
  title,
  subtitle,
  leading,
  children,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'sticky top-14 z-30 mb-6 border-b border-stone-300/70 bg-[var(--bg)]/90 py-3 backdrop-blur-md dark:border-stone-800/70',
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-end gap-3">
          {leading}
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-stone-900 dark:text-stone-50 sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm text-stone-700 dark:text-stone-400">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
