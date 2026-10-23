import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-stone-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/70',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-sm font-semibold tracking-tight text-stone-800 dark:text-stone-100',
        className,
      )}
      {...props}
    />
  )
}
