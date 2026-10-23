import type { LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-xs font-semibold tracking-wide text-stone-800 uppercase dark:text-stone-300',
        className,
      )}
      {...props}
    />
  )
}
