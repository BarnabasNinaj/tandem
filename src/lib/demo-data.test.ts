import { describe, expect, it } from 'vitest'
import {
  ALL_DEMO_MONTH_KEYS,
  buildDemoHistory,
  DEMO_MONTH_KEYS,
  stripDemoMonths,
} from './demo-data'

describe('demo-data', () => {
  it('builds six H1 2026 months', () => {
    const history = buildDemoHistory()
    expect(Object.keys(history).sort()).toEqual([...DEMO_MONTH_KEYS])
    for (const key of DEMO_MONTH_KEYS) {
      expect(history[key]?.notes).toMatch(/demo data/)
      expect(history[key]?.computed.totalInflow).toBeGreaterThan(0)
    }
  })

  it('stripDemoMonths removes current and legacy sample keys only', () => {
    const june = buildDemoHistory()['2026-06']!
    const history = {
      ...buildDemoHistory(),
      '2026-09': { ...june, monthKey: '2026-09', notes: 'legacy demo' },
      '2025-12': { ...june, monthKey: '2025-12', notes: 'real month' },
    }

    const stripped = stripDemoMonths(history)
    expect(Object.keys(stripped)).toEqual(['2025-12'])
    for (const key of ALL_DEMO_MONTH_KEYS) {
      expect(stripped[key]).toBeUndefined()
    }
  })
})
