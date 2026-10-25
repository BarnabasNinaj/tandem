import { describe, expect, it } from 'vitest'
import {
  alignDraftToCategories,
  alignHistoryToCategories,
  alignOutflowsToCategories,
  buildMonthlyRecord,
  computeMonthly,
  draftForMonth,
  draftFromRecord,
  emptyDraft,
  savingsRate,
} from './finance'
import { round2 } from './number'
import { DEFAULT_CATEGORIES } from '@/types/tandem'

describe('round2', () => {
  it('rounds to two decimal places', () => {
    expect(round2(1.006)).toBe(1.01)
    expect(round2(10.994)).toBe(10.99)
    expect(round2(2.5)).toBe(2.5)
  })
})

describe('computeMonthly', () => {
  it('Z = X − Y; equal splits expenses and leftover', () => {
    const computed = computeMonthly(
      {
        partnerASalary: 2000,
        partnerBIncome: 1000,
        otherInflows: 0,
      },
      [
        {
          categoryId: 'housing',
          categoryName: 'Housing',
          amount: 900,
        },
      ],
      'equal',
    )

    expect(computed.totalInflow).toBe(3000)
    expect(computed.totalOutflow).toBe(900)
    expect(computed.leftoverAfterExpenses).toBe(2100)
    expect(computed.discretionarySurplus).toBe(2100)
    expect(computed.expenseSharePartnerA).toBe(450)
    expect(computed.expenseSharePartnerB).toBe(450)
    expect(computed.personalAllowancePartnerA).toBe(1050)
    expect(computed.personalAllowancePartnerB).toBe(1050)
    expect(computed.allowanceSplit).toBe('equal')
  })

  it('splits expenses and leftover by income (Other excluded from ratio)', () => {
    // X=3500, Y=1400, Z=2100; earned 2000:1000 → 2:1
    const computed = computeMonthly(
      {
        partnerASalary: 2000,
        partnerBIncome: 1000,
        otherInflows: 500,
      },
      [
        {
          categoryId: 'housing',
          categoryName: 'Housing',
          amount: 1400,
        },
      ],
      'income',
    )

    expect(computed.leftoverAfterExpenses).toBe(2100)
    expect(computed.discretionarySurplus).toBe(2100)
    expect(computed.expenseSharePartnerA).toBe(933.33)
    expect(computed.expenseSharePartnerB).toBe(466.67)
    expect(computed.personalAllowancePartnerA).toBe(1400)
    expect(computed.personalAllowancePartnerB).toBe(700)
    expect(computed.allowanceSplit).toBe('income')
  })
})

describe('buildMonthlyRecord / savings', () => {
  it('stores computed fields and savings rate', () => {
    const record = buildMonthlyRecord({
      monthKey: '2026-11',
      inflows: {
        partnerASalary: 1000,
        partnerBIncome: 0,
        otherInflows: 0,
      },
      outflows: [
        {
          categoryId: 'misc',
          categoryName: 'Misc',
          amount: 400,
        },
      ],
    })

    expect(record.computed.leftoverAfterExpenses).toBe(600)
    expect(record.computed.discretionarySurplus).toBe(600)
    expect(savingsRate(record)).toBe(60)
    expect(record).not.toHaveProperty('allocations')
    expect(record).not.toHaveProperty('portfolioSnapshot')
  })

  it('emptyDraft carries previous salaries', () => {
    const previous = buildMonthlyRecord(
      emptyDraft('2026-10', DEFAULT_CATEGORIES),
    )
    previous.inflows.partnerASalary = 2800

    const draft = emptyDraft('2026-11', DEFAULT_CATEGORIES, previous)
    expect(draft.inflows.partnerASalary).toBe(2800)
    expect(draft.outflows).toHaveLength(DEFAULT_CATEGORIES.length)
  })
})

describe('alignOutflowsToCategories / alignDraftToCategories', () => {
  it('keeps amounts, drops removed, adds new at 0, refreshes names', () => {
    const aligned = alignOutflowsToCategories(
      [
        { categoryId: 'housing', categoryName: 'Old Housing', amount: 800 },
        { categoryId: 'gone', categoryName: 'Gone', amount: 50 },
      ],
      [
        { id: 'housing', name: 'Housing' },
        { id: 'groceries', name: 'Groceries' },
      ],
    )
    expect(aligned).toEqual([
      { categoryId: 'housing', categoryName: 'Housing', amount: 800 },
      { categoryId: 'groceries', categoryName: 'Groceries', amount: 0 },
    ])
  })

  it('alignDraftToCategories is a no-op when already aligned', () => {
    const draft = emptyDraft('2026-10', DEFAULT_CATEGORIES)
    expect(alignDraftToCategories(draft, DEFAULT_CATEGORIES)).toBe(draft)
  })

  it('alignDraftToCategories updates outflows when categories change', () => {
    const draft = emptyDraft('2026-10', DEFAULT_CATEGORIES)
    draft.outflows[0]!.amount = 120
    const nextCats = [
      ...DEFAULT_CATEGORIES,
      { id: 'pets', name: 'Pets' },
    ]
    const aligned = alignDraftToCategories(draft, nextCats)
    expect(aligned).not.toBe(draft)
    expect(aligned.outflows).toHaveLength(nextCats.length)
    expect(aligned.outflows.find((o) => o.categoryId === 'pets')?.amount).toBe(
      0,
    )
    expect(
      aligned.outflows.find((o) => o.categoryId === draft.outflows[0]!.categoryId)
        ?.amount,
    ).toBe(120)
  })

  it('alignHistoryToCategories refreshes stored names on rename', () => {
    const month = buildMonthlyRecord({
      ...emptyDraft('2026-01', DEFAULT_CATEGORIES),
      inflows: {
        partnerASalary: 2000,
        partnerBIncome: 1000,
        otherInflows: 0,
      },
      outflows: DEFAULT_CATEGORIES.map((c) => ({
        categoryId: c.id,
        categoryName: c.name,
        amount: c.id === 'dining' ? 100 : 0,
      })),
    })
    const renamed = DEFAULT_CATEGORIES.map((c) =>
      c.id === 'dining' ? { ...c, name: 'Restaurants' } : c,
    )
    const history = alignHistoryToCategories(
      { '2026-01': month },
      renamed,
      'equal',
    )
    expect(history).not.toBeNull()
    const dining = history['2026-01']!.outflows.find(
      (o) => o.categoryId === 'dining',
    )
    expect(dining?.categoryName).toBe('Restaurants')
    expect(dining?.amount).toBe(100)
  })
})

describe('draftFromRecord / draftForMonth', () => {
  it('reloads a saved month for editing', () => {
    const saved = buildMonthlyRecord({
      ...emptyDraft('2026-03', DEFAULT_CATEGORIES),
      inflows: {
        partnerASalary: 2800,
        partnerBIncome: 2100,
        otherInflows: 50,
      },
      outflows: DEFAULT_CATEGORIES.map((c) => ({
        categoryId: c.id,
        categoryName: c.name,
        amount: c.id === 'groceries' ? 400 : 0,
      })),
    })
    const draft = draftFromRecord(saved, DEFAULT_CATEGORIES)
    expect(draft.monthKey).toBe('2026-03')
    expect(draft.inflows.partnerASalary).toBe(2800)
    expect(draft.outflows.find((o) => o.categoryId === 'groceries')?.amount).toBe(
      400,
    )
  })

  it('draftForMonth loads existing or seeds a new month', () => {
    const saved = buildMonthlyRecord({
      ...emptyDraft('2026-03', DEFAULT_CATEGORIES),
      inflows: {
        partnerASalary: 2800,
        partnerBIncome: 1000,
        otherInflows: 0,
      },
    })
    const history = { '2026-03': saved }
    expect(draftForMonth(history, '2026-03', DEFAULT_CATEGORIES).inflows.partnerASalary).toBe(
      2800,
    )
    const next = draftForMonth(history, '2026-04', DEFAULT_CATEGORIES)
    expect(next.monthKey).toBe('2026-04')
    expect(next.inflows.partnerASalary).toBe(2800)
    expect(next.outflows.every((o) => o.amount === 0)).toBe(true)
  })
})
