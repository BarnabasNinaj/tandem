import { useState } from 'react'
import { legendLabel } from '@/components/analytics/chart-theme'

/**
 * Legend payload key for show/hide.
 * Bar/line series use a unique `dataKey`. Pie slices share `dataKey: "value"` —
 * use the slice label (`value`) instead or every click toggles the wrong key.
 */
export function legendSeriesKey(payload: {
  dataKey?: string | number
  value?: string
}): string {
  const dataKey =
    payload.dataKey != null && payload.dataKey !== ''
      ? String(payload.dataKey)
      : ''
  const label =
    payload.value != null && payload.value !== '' ? String(payload.value) : ''
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

  const legendProps = {
    formatter: (value: string, entry: { dataKey?: string | number }) =>
      legendLabel(String(value), hidden.has(legendSeriesKey({ ...entry, value }))),
    onClick: (payload: { dataKey?: string | number; value?: string }) => {
      toggle(legendSeriesKey(payload))
    },
    wrapperStyle: { cursor: 'pointer' as const },
  }

  return { toggle, isHidden, legendProps }
}
