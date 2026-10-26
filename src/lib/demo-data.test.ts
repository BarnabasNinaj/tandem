import { describe, expect, it } from 'vitest'
import {
  ALL_DEMO_MONTH_KEYS,
  buildDemoHistory,
  DEMO_MONTH_KEYS,
  stripDemoMonths,
} from './demo-data'
import { DEFAULT_CATEGORIES } from '@/types/tandem'

describe('demo-data', () => {
  it('builds twelve 2026 months', () => {
    const history = buildDemoHistory()
    expect(Object.keys(history).sort()).toEqual([...DEMO_MONTH_KEYS])
    expect(DEMO_MONTH_KEYS).toHaveLength(12)
    for (const key of DEMO_MONTH_KEYS) {
      expect(history[key]?.notes).toMatch(/demo 2026/)
      expect(history[key]?.computed.totalInflow).toBeGreaterThan(0)
      expect(
        history[key]?.outflows.some((o) => o.categoryId === 'investments'),
      ).toBe(true)
    }
  })

  it('varies partner incomes and category spend across the year', () => {
    const history = buildDemoHistory()
    const aSalaries = DEMO_MONTH_KEYS.map(
      (k) => history[k]!.inflows.partnerASalary,
    )
    const bIncomes = DEMO_MONTH_KEYS.map(
      (k) => history[k]!.inflows.partnerBIncome,
    )
    const leftovers = DEMO_MONTH_KEYS.map(
      (k) => history[k]!.computed.leftoverAfterExpenses,
    )
    const groceries = DEMO_MONTH_KEYS.map(
      (k) =>
        history[k]!.outflows.find((o) => o.categoryId === 'groceries')!.amount,
    )
    const housing = DEMO_MONTH_KEYS.map(
      (k) =>
        history[k]!.outflows.find((o) => o.categoryId === 'housing')!.amount,
    )
    expect(new Set(aSalaries).size).toBeGreaterThan(3)
    expect(new Set(bIncomes).size).toBeGreaterThan(5)
    expect(new Set(groceries).size).toBeGreaterThan(8)
    expect(new Set(housing).size).toBeGreaterThan(1)
    // Mid-year leave dip vs year-end; Dec is the spend peak
    expect(history['2026-07']!.inflows.partnerBIncome).toBeLessThan(
      history['2026-01']!.inflows.partnerBIncome,
    )
    expect(history['2026-12']!.computed.totalOutflow).toBeGreaterThan(
      history['2026-02']!.computed.totalOutflow,
    )
    // Some months finish in the red; surplus months still exist
    expect(leftovers.some((z) => z < 0)).toBe(true)
    expect(leftovers.some((z) => z > 0)).toBe(true)
    expect(Math.max(...leftovers) - Math.min(...leftovers)).toBeGreaterThan(3000)
  })

  it('uses current category names and ids (not list index)', () => {
    const cats = DEFAULT_CATEGORIES.map((c) =>
      c.id === 'dining' ? { ...c, name: 'Restaurants' } : c,
    )
    const jan = buildDemoHistory(cats)['2026-01']!
    const dining = jan.outflows.find((o) => o.categoryId === 'dining')
    expect(dining?.categoryName).toBe('Restaurants')
    expect(dining?.amount).toBe(55)
    const kids = jan.outflows.find((o) => o.categoryId === 'kids')
    expect(kids?.amount).toBe(95)
  })

  it('stripDemoMonths removes sample keys only', () => {
    const history = {
      ...buildDemoHistory(),
      '2025-12': {
        ...buildDemoHistory()['2026-06']!,
        monthKey: '2025-12',
        notes: 'real month',
      },
    }

    const stripped = stripDemoMonths(history)
    expect(Object.keys(stripped)).toEqual(['2025-12'])
    for (const key of ALL_DEMO_MONTH_KEYS) {
      expect(stripped[key]).toBeUndefined()
    }
  })
})
