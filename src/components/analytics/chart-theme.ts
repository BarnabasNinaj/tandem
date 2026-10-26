import { createElement, type ReactNode } from 'react'

/** Distinct series hues — not a teal-only stack. */
export const CHART = {
  netWorth: '#0369a1',
  income: '#15803d',
  expense: '#c2410c',
  projected: '#78716c',
} as const

/** Category pie / lines — high contrast across hues. */
export const CAT_COLORS = [
  '#0369a1',
  '#c2410c',
  '#854d0e',
  '#be123c',
  '#4d7c0f',
  '#0f766e',
  '#7c3aed',
  '#57534e',
]

/** Axis ticks: theme tokens so dark mode isn’t stuck on Recharts’ #666. */
export const axisTick = {
  fontSize: 11,
  fill: 'var(--text-faint)',
} as const

/** Legend label color — series fill is for the swatch only (pastel fills fail as text). */
export function legendLabel(value: string, dimmed = false): ReactNode {
  return createElement(
    'span',
    {
      style: {
        color: 'var(--text-muted)',
        textDecoration: dimmed ? 'line-through' : undefined,
        opacity: dimmed ? 0.45 : 1,
      },
    },
    value,
  )
}

/** Tooltip chrome — pair with tipLabelStyle / tipItemStyle (Recharts defaults are light-only). */
export const tipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text)',
  boxShadow: '0 10px 28px rgb(0 0 0 / 0.22)',
} as const

export const tipLabelStyle = {
  color: 'var(--text-muted)',
  marginBottom: 4,
} as const

/** Force readable value text; series swatch color alone is not enough in dark mode. */
export const tipItemStyle = {
  color: 'var(--text)',
  paddingBlock: 2,
} as const

export const tipProps = {
  contentStyle: tipStyle,
  labelStyle: tipLabelStyle,
  itemStyle: tipItemStyle,
} as const
