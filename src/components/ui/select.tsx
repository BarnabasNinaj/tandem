import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Layout classes for the outer wrapper (width, shrink). Default: `w-full`. */
  wrapperClassName?: string
}

export function Select({
  className,
  wrapperClassName,
  children,
  ...props
}: SelectProps) {
  return (
    <div className={cn('relative', wrapperClassName ?? 'w-full')}>
      <select
        className={cn(
          'flex h-10 w-full cursor-pointer appearance-none rounded-lg border border-stone-400 bg-white py-0 pr-9 pl-3 text-sm font-medium text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-stone-500 dark:text-stone-400"
        aria-hidden
      />
    </div>
  )
}
