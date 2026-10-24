import { describe, expect, it } from 'vitest'
import {
  buildMonthOutlook,
  categoryStats,
  expenseGrid,
  incomeExpenseWithProjection,
  incomeMonths,
  linearSlope,
  shiftMonthKey,
  sliceHistory,
  summarizeIncomes,
} from './analytics'
import { buildMonthlyRecord, type WizardDraft } from './finance'
import { round2 } from './number'

function month(
  monthKey: string,
  housing: number,
  groceries: number,
  incomeA = 2000,
): ReturnType<typeof buildMonthlyRecord> {
  const draft: WizardDraft = {
    monthKey,
    inflows: {
      partnerASalary: incomeA,
      partnerBIncome: 1000,
      otherInflows: 0,
    },
    outflows: [
      { categoryId: 'housing', categoryName: 'Housing', amount: housing },
      {
        categoryId: 'groceries',
        categoryName: 'Groceries',
        amount: groceries,
      },
    ],
  }
  return buildMonthlyRecord(draft, 'equal')
}

describe('shiftMonthKey', () => {
  it('steps forward and backward across year bounds', () => {
    expect(shiftMonthKey('2026-11', 1)).toBe('2026-12')
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01')
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12')
  })
})

describe('linearSlope', () => {
  it('returns 0 for flat or short series', () => {
    expect(linearSlope([1])).toBe(0)
    expect(linearSlope([5, 5, 5])).toBe(0)
  })

  it('detects a unit rise', () => {
    expect(linearSlope([1, 2, 3, 4])).toBe(1)
  })
})

describe('sliceHistory', () => {
  it('keeps the latest N months', () => {
    const history = {
      '2026-01': month('2026-01', 900, 300),
      '2026-02': month('2026-02', 900, 320),
      '2026-03': month('2026-03', 900, 340),
      '2026-04': month('2026-04', 900, 360),
    }
    expect(sliceHistory(history, '3M').map((r) => r.monthKey)).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
    ])
  })
})

describe('categoryStats', () => {
  it('averages monthly spend and reports slope', () => {
    const records = [
      month('2026-01', 900, 300),
      month('2026-02', 900, 400),
      month('2026-03', 900, 500),
    ]
    const stats = categoryStats(records)
    const groceries = stats.find((s) => s.categoryId === 'groceries')!
    expect(groceries.average).toBe(400)
    expect(groceries.lastAmount).toBe(500)
    expect(groceries.slope).toBe(100)
    const housing = stats.find((s) => s.categoryId === 'housing')!
    expect(housing.average).toBe(900)
    expect(housing.slope).toBe(0)
  })
})

describe('buildMonthOutlook', () => {
  it('projects trailing averages into future months', () => {
    const records = [
      month('2026-01', 900, 300),
      month('2026-02', 900, 300),
      month('2026-03', 900, 300),
    ]
    const outlook = buildMonthOutlook(records, {
      focusMonthKey: '2026-04',
      projectMonths: 2,
    })
    expect(outlook).not.toBeNull()
    expect(outlook!.sampleSize).toBe(3)
    expect(outlook!.avgExpense).toBe(1200)
    expect(outlook!.focusRecorded).toBe(false)
    expect(outlook!.projected).toHaveLength(2)
    expect(outlook!.projected[0]!.monthKey).toBe('2026-04')
    expect(outlook!.projected[0]!.expense).toBe(1200)
    expect(outlook!.projected[1]!.monthKey).toBe('2026-05')
  })

  it('compares a recorded focus month to the average', () => {
    const records = [
      month('2026-01', 900, 300),
      month('2026-02', 900, 300),
      month('2026-03', 800, 200, 2500),
    ]
    const outlook = buildMonthOutlook(records, {
      focusMonthKey: '2026-03',
      projectMonths: 1,
    })
    expect(outlook!.focusRecorded).toBe(true)
    expect(outlook!.focusExpense).toBe(1000)
    expect(outlook!.focusExpenseDelta).toBe(round2(1000 - outlook!.avgExpense))
  })
})

describe('incomeMonths', () => {
  it('keeps only the three income buckets', () => {
    const rows = incomeMonths([
      month('2026-01', 900, 300, 2000),
      month('2026-02', 800, 200, 2500),
    ])
    expect(rows).toEqual([
      {
        monthKey: '2026-01',
        label: '01/2026',
        partnerA: 2000,
        partnerB: 1000,
        other: 0,
        total: 3000,
      },
      {
        monthKey: '2026-02',
        label: '02/2026',
        partnerA: 2500,
        partnerB: 1000,
        other: 0,
        total: 3500,
      },
    ])
    const summary = summarizeIncomes(rows)
    expect(summary?.total).toBe(6500)
    expect(summary?.avgTotal).toBe(3250)
    expect(summary?.avgPartnerA).toBe(2250)
  })
})

describe('expenseGrid', () => {
  it('pivots categories into columns and drops income', () => {
    const grid = expenseGrid([
      month('2026-01', 900, 300),
      month('2026-02', 900, 400),
    ])
    expect(grid.categories.map((c) => c.id)).toEqual(['housing', 'groceries'])
    expect(grid.categories[0]?.total).toBe(1800)
    expect(grid.rows[1]?.byCategory.groceries).toBe(400)
    expect(grid.rows[1]?.total).toBe(1300)
    expect(grid.rows[0]).not.toHaveProperty('partnerA')
  })
})

describe('incomeExpenseWithProjection', () => {
  it('appends projected points after actuals', () => {
    const records = [month('2026-01', 900, 300), month('2026-02', 900, 300)]
    const series = incomeExpenseWithProjection(records, 2)
    expect(series).toHaveLength(4)
    expect(series[0]!.kind).toBe('actual')
    expect(series[2]!.kind).toBe('projected')
    expect(series[2]!.income).toBeNull()
    expect(series[2]!.projectedExpense).toBe(1200)
  })
})
