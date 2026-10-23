import type { LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-xs font-medium tracking-wide text-stone-600 uppercase dark:text-stone-400',
        className,
      )}
      {...props}
    />
  )
}
