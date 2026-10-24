import type { CardOwner } from '@/types/tandem'

/**
 * Stable hues for partners + household common — badges, charts, copy.
 * Deliberately away from brand teal so owner chips don’t blend into the app chrome.
 */
export const PARTNER_COLOR = {
  partnerA: '#0369a1', // blue
  partnerB: '#be123c', // rose
  common: '#7c3aed', // violet
  other: '#ca8a04', // amber
} as const

export const OWNER_CYCLE: CardOwner[] = ['partnerA', 'partnerB', 'common']

export function nextOwner(owner: CardOwner): CardOwner {
  const i = OWNER_CYCLE.indexOf(owner)
  return OWNER_CYCLE[(i + 1) % OWNER_CYCLE.length]!
}

export function ownerInitial(
  owner: CardOwner,
  partnerAName: string,
  partnerBName: string,
): string {
  if (owner === 'common') return 'C'
  if (owner === 'partnerA') return (partnerAName.trim()[0] ?? 'A').toUpperCase()
  return (partnerBName.trim()[0] ?? 'B').toUpperCase()
}

export function ownerFullName(
  owner: CardOwner,
  partnerAName: string,
  partnerBName: string,
): string {
  if (owner === 'common') return 'Common'
  if (owner === 'partnerA') return partnerAName
  return partnerBName
}

export function ownerColor(owner: CardOwner): string {
  return PARTNER_COLOR[owner]
}
