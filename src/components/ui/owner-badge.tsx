import { ownerFullName, ownerInitial } from '@/lib/partners'
import { cn } from '@/lib/utils'
import type { CardOwner } from '@/types/tandem'

const OWNER_CSS_VAR: Record<CardOwner, string> = {
  partnerA: 'var(--partner-a)',
  partnerB: 'var(--partner-b)',
  common: 'var(--partner-common)',
}

export function OwnerBadge({
  owner,
  partnerAName,
  partnerBName,
  onClick,
  className,
}: {
  owner: CardOwner
  partnerAName: string
  partnerBName: string
  onClick?: () => void
  className?: string
}) {
  const who = ownerFullName(owner, partnerAName, partnerBName)
  const color = OWNER_CSS_VAR[owner]
  const label = ownerInitial(owner, partnerAName, partnerBName)

  const shared = cn(
    'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold',
    onClick && 'cursor-pointer',
    className,
  )

  const style = {
    backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
    color,
  } as const

  if (onClick) {
    return (
      <button
        type="button"
        title={`${who} — click to change`}
        aria-label={`Owner ${who}. Click to change.`}
        onClick={onClick}
        className={shared}
        style={style}
      >
        {label}
      </button>
    )
  }

  return (
    <span title={who} aria-label={who} className={shared} style={style}>
      {label}
    </span>
  )
}
