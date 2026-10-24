import { describe, expect, it } from 'vitest'
import {
  mappingsForBank,
  mergeCardLinesIntoOutflows,
  normalizeBankLabel,
  upsertBankMappings,
} from './card-expenses'
import { DEFAULT_CATEGORIES } from '@/types/tandem'

describe('normalizeBankLabel', () => {
  it('trims and lowercases', () => {
    expect(normalizeBankLabel('  Groceries  ')).toBe('groceries')
    expect(normalizeBankLabel('Dining   Out')).toBe('dining out')
  })
})

describe('upsertBankMappings + mappingsForBank', () => {
  it('scopes by bank and updates by key', () => {
    const next = upsertBankMappings(
      [
        {
          bankId: 'b1',
          key: 'fuel',
          label: 'Fuel',
          categoryId: 'transport',
        },
        {
          bankId: 'b2',
          key: 'fuel',
          label: 'Fuel',
          categoryId: 'misc',
        },
      ],
      'b1',
      [
        { label: 'Petrol', categoryId: 'transport' },
        { key: 'fuel', label: 'Fuel', categoryId: 'misc' },
        { label: 'Restaurant', categoryId: 'dining' },
      ],
    )
    expect(mappingsForBank(next, 'b1')).toEqual([
      { bankId: 'b1', key: 'fuel', label: 'Fuel', categoryId: 'misc' },
      {
        bankId: 'b1',
        key: 'petrol',
        label: 'Petrol',
        categoryId: 'transport',
      },
      {
        bankId: 'b1',
        key: 'restaurant',
        label: 'Restaurant',
        categoryId: 'dining',
      },
    ])
    expect(mappingsForBank(next, 'b2')).toEqual([
      { bankId: 'b2', key: 'fuel', label: 'Fuel', categoryId: 'misc' },
    ])
  })
})

describe('mergeCardLinesIntoOutflows', () => {
  it('adds card amounts into existing outflows and skips zeros', () => {
    const outflows = DEFAULT_CATEGORIES.map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      amount: c.id === 'groceries' ? 50 : 0,
    }))
    const merged = mergeCardLinesIntoOutflows(
      outflows,
      [
        { categoryId: 'groceries', amount: 100 },
        { categoryId: 'transport', amount: 40 },
        { categoryId: 'dining', amount: 0 },
      ],
      DEFAULT_CATEGORIES,
    )
    expect(merged.find((o) => o.categoryId === 'groceries')?.amount).toBe(150)
    expect(merged.find((o) => o.categoryId === 'transport')?.amount).toBe(40)
    expect(merged.find((o) => o.categoryId === 'dining')?.amount).toBe(0)
  })
})
