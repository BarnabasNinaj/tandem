import { cn } from '@/lib/utils'

export function Progress({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-stone-300 dark:bg-stone-700',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-teal-800 transition-all duration-500 dark:bg-teal-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
