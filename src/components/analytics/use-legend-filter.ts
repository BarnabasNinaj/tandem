import { useState } from 'react'
import type { LegendPayload, LegendProps } from 'recharts'
import { legendLabel } from '@/components/analytics/chart-theme'

/**
 * Legend payload key for show/hide.
 * Bar/line series use a unique `dataKey`. Pie slices share `dataKey: "value"` —
 * use the slice label (`value`) instead or every click toggles the wrong key.
 */
export function legendSeriesKey(payload: {
  dataKey?: string | number | ((obj: unknown) => unknown)
  value?: unknown
}): string {
  const rawKey = payload.dataKey
  const dataKey =
    rawKey != null && typeof rawKey !== 'function' && String(rawKey) !== ''
      ? String(rawKey)
      : ''
  const label =
    payload.value != null && String(payload.value) !== ''
      ? String(payload.value)
      : ''
  if (dataKey && dataKey !== 'value') return dataKey
  return label || dataKey
}

/** Click a chart legend item to show/hide that series. Resets when `resetKey` changes (e.g. range). */
export function useLegendFilter(resetKey?: string) {
  const [hidden, setHidden] = useState(() => new Set<string>())
  const [seenKey, setSeenKey] = useState(resetKey)
  if (resetKey !== seenKey) {
    setSeenKey(resetKey)
    setHidden(new Set())
  }

  const toggle = (key: string) => {
    if (!key) return
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isHidden = (key: string) => hidden.has(key)

  const legendProps: Pick<
    LegendProps,
    'formatter' | 'onClick' | 'wrapperStyle'
  > = {
    formatter: (value, entry) =>
      legendLabel(
        String(value),
        hidden.has(legendSeriesKey({ dataKey: entry.dataKey, value })),
      ),
    onClick: (payload: LegendPayload) => {
      toggle(legendSeriesKey({ dataKey: payload.dataKey, value: payload.value }))
    },
    wrapperStyle: { cursor: 'pointer' },
  }

  return { toggle, isHidden, legendProps }
}
