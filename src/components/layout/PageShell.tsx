import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Page frame under the app header: sticky title above body content.
 * Body is `z-0` so it stacks under the sticky band. No `isolate` here —
 * isolation promotes layers and contributes to sticky text blur on mobile.
 */
export function PageShell({
  header,
  children,
  className,
  bodyClassName,
}: {
  header: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <div className={cn('relative', className)}>
      {header}
      <div className={cn('relative z-0', bodyClassName)}>{children}</div>
    </div>
  )
}
