import { describe, expect, it } from 'vitest'
import {
  mapCardLines,
  mergeCardLinesIntoOutflows,
  normalizeBankLabel,
  parseCardPaste,
  upsertMappings,
} from './card-expenses'
import { DEFAULT_CATEGORIES } from '@/types/tandem'

describe('normalizeBankLabel', () => {
  it('trims and lowercases', () => {
    expect(normalizeBankLabel('  Groceries  ')).toBe('groceries')
    expect(normalizeBankLabel('Dining   Out')).toBe('dining out')
  })
})

describe('parseCardPaste', () => {
  it('parses space / tab / semicolon / colon amounts', () => {
    const lines = parseCardPaste(`
Groceries 120,50
Restaurant\t45
Fuel; 60
Dining: 12.3
`)
    expect(lines).toEqual([
      { label: 'Groceries', key: 'groceries', amount: 120.5 },
      { label: 'Restaurant', key: 'restaurant', amount: 45 },
      { label: 'Fuel', key: 'fuel', amount: 60 },
      { label: 'Dining', key: 'dining', amount: 12.3 },
    ])
  })

  it('sums duplicate labels in one paste', () => {
    const lines = parseCardPaste(`Groceries 10\nGroceries 5`)
    expect(lines).toEqual([
      { label: 'Groceries', key: 'groceries', amount: 15 },
    ])
  })
})

describe('mapCardLines + merge', () => {
  it('maps known labels and merges into outflows', () => {
    const parsed = parseCardPaste(`Groceries 100\nFuel 40\nWeird 10`)
    const mapped = mapCardLines(
      parsed,
      [
        {
          key: 'groceries',
          label: 'Groceries',
          categoryId: 'groceries',
        },
        { key: 'fuel', label: 'Fuel', categoryId: 'transport' },
      ],
      DEFAULT_CATEGORIES,
    )
    expect(mapped.find((m) => m.key === 'groceries')?.categoryId).toBe(
      'groceries',
    )
    expect(mapped.find((m) => m.key === 'weird')?.categoryId).toBeNull()

    const outflows = DEFAULT_CATEGORIES.map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      amount: c.id === 'groceries' ? 50 : 0,
    }))
    const merged = mergeCardLinesIntoOutflows(
      outflows,
      mapped
        .filter((m) => m.categoryId)
        .map((m) => ({ categoryId: m.categoryId!, amount: m.amount })),
      DEFAULT_CATEGORIES,
    )
    expect(merged.find((o) => o.categoryId === 'groceries')?.amount).toBe(150)
    expect(merged.find((o) => o.categoryId === 'transport')?.amount).toBe(40)
  })
})

describe('upsertMappings', () => {
  it('adds and updates by key', () => {
    const next = upsertMappings(
      [{ key: 'fuel', label: 'Fuel', categoryId: 'transport' }],
      [
        { key: 'fuel', label: 'Petrol', categoryId: 'misc' },
        { key: 'restaurant', label: 'Restaurant', categoryId: 'dining' },
      ],
    )
    expect(next.find((m) => m.key === 'fuel')).toEqual({
      key: 'fuel',
      label: 'Petrol',
      categoryId: 'misc',
    })
    expect(next.find((m) => m.key === 'restaurant')?.categoryId).toBe('dining')
  })
})
