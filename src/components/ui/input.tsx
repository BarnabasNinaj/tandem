import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-lg border border-stone-400 bg-white px-3 py-2 text-sm font-medium text-stone-950 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50 dark:placeholder:text-stone-500',
        className,
      )}
      {...props}
    />
  )
}
