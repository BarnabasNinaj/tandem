import type { ReactNode } from 'react'

type AuthShellProps = {
  children?: ReactNode
  tagline: ReactNode
  /** Extra classes on the outer shell (e.g. setup padding tweaks). */
  className?: string
}

/** Uses shared `public/auth-shell.css` so HTML static shell ↔ React don’t jump. */
export function AuthShell({ children, tagline, className = '' }: AuthShellProps) {
  return (
    <div className={`auth-shell ${className}`.trim()}>
      <div className="auth-shell-bg" aria-hidden />
      <div className="auth-shell-inner">
        <p className="auth-logo">Tandem</p>
        <p className="auth-tagline">{tagline}</p>
        {children}
      </div>
    </div>
  )
}
