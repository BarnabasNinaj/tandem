import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Page-level section title (below PageHeader). Sentence case, display weight —
 * distinct from MetaLabel (tiny uppercase) used for metrics / columns / badges.
 */
export function SectionHeading({
  title,
  subtitle,
  as: Tag = 'h2',
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  as?: 'h2' | 'h3'
  className?: string
}) {
  return (
    <div className={cn(className)}>
      <Tag className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-lg">
        {title}
      </Tag>
      {subtitle ? (
        <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

const metaLabelClass =
  'text-[10px] font-medium tracking-[0.14em] text-stone-600 uppercase dark:text-stone-400'

/** Compact uppercase chrome — metric keys, column hints, status chips. Not for sections. */
export function MetaLabel({
  as: Tag = 'p',
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: 'p' | 'span' }) {
  return <Tag className={cn(metaLabelClass, className)} {...props} />
}
