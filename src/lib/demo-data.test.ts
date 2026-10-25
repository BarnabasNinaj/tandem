import { describe, expect, it } from 'vitest'
import {
  ALL_DEMO_MONTH_KEYS,
  buildDemoHistory,
  DEMO_MONTH_KEYS,
  stripDemoMonths,
} from './demo-data'
import { DEFAULT_CATEGORIES } from '@/types/tandem'

describe('demo-data', () => {
  it('builds six H1 2026 months', () => {
    const history = buildDemoHistory()
    expect(Object.keys(history).sort()).toEqual([...DEMO_MONTH_KEYS])
    for (const key of DEMO_MONTH_KEYS) {
      expect(history[key]?.notes).toMatch(/demo data/)
      expect(history[key]?.computed.totalInflow).toBeGreaterThan(0)
      expect(
        history[key]?.outflows.some((o) => o.categoryId === 'investments'),
      ).toBe(true)
    }
  })

  it('uses current category names and ids (not list index)', () => {
    const cats = DEFAULT_CATEGORIES.map((c) =>
      c.id === 'dining' ? { ...c, name: 'Restaurants' } : c,
    )
    const jan = buildDemoHistory(cats)['2026-01']!
    const dining = jan.outflows.find((o) => o.categoryId === 'dining')
    expect(dining?.categoryName).toBe('Restaurants')
    expect(dining?.amount).toBe(90)
    const kids = jan.outflows.find((o) => o.categoryId === 'kids')
    expect(kids?.amount).toBe(160)
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
