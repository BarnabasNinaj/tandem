import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared page title band — sticky under the app header.
 *
 * Keep this node free of `transform` / `opacity` animation / `filter` /
 * `box-shadow` layer promotion. Those force a GPU layer on mobile and flash
 * blurry text (subpixel AA dropped) on every scroll. Seam seal is a plain
 * absolute fill, not a shadow.
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
        'relative sticky top-14 z-30 -mx-5 mb-6 border-b border-stone-300/70 bg-[var(--bg)] px-5 py-3 sm:-mx-8 sm:px-8 dark:border-stone-800/70',
        className,
      )}
    >
      {/* Opaque fill into the app-header seam — no transform/shadow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-full h-2 bg-[var(--bg)]"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-end gap-3">
          {leading}
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold leading-8 text-stone-900 dark:text-stone-50 sm:text-3xl sm:leading-9">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-[14px] leading-5 text-stone-700 dark:text-stone-400">
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
