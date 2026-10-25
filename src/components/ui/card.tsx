import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-stone-300 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900/70',
        className,
      )}
      {...props}
    />
  )
}

/** In-card section title — same tier as `SectionHeading` (sentence case, not MetaLabel). */
export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-stone-900 dark:text-stone-50',
        className,
      )}
      {...props}
    />
  )
}
