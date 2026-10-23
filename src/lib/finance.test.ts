import { describe, expect, it } from 'vitest'
import {
  buildMonthlyRecord,
  computeMonthly,
  emptyDraft,
  netWorthFromSnapshot,
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
  it('Z = X − Y; pocket = Z − allocations; equal splits both', () => {
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
      {
        emergencyReserve: 200,
        travelFund: 100,
        investments: 300,
      },
      'equal',
    )

    expect(computed.totalInflow).toBe(3000)
    expect(computed.totalOutflow).toBe(900)
    expect(computed.leftoverAfterExpenses).toBe(2100)
    expect(computed.discretionarySurplus).toBe(1500)
    expect(computed.expenseSharePartnerA).toBe(450)
    expect(computed.expenseSharePartnerB).toBe(450)
    expect(computed.personalAllowancePartnerA).toBe(750)
    expect(computed.personalAllowancePartnerB).toBe(750)
    expect(computed.allowanceSplit).toBe('equal')
  })

  it('splits expenses and pocket by income (Other excluded from ratio)', () => {
    // X=3500, Y=1400, Z=2100, alloc=600 → pocket=1500
    // earned 2000:1000 → 2:1
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
      {
        emergencyReserve: 200,
        travelFund: 100,
        investments: 300,
      },
      'income',
    )

    expect(computed.leftoverAfterExpenses).toBe(2100)
    expect(computed.discretionarySurplus).toBe(1500)
    expect(computed.expenseSharePartnerA).toBe(933.33)
    expect(computed.expenseSharePartnerB).toBe(466.67)
    expect(computed.personalAllowancePartnerA).toBe(1000)
    expect(computed.personalAllowancePartnerB).toBe(500)
    expect(computed.allowanceSplit).toBe('income')
  })
})

describe('buildMonthlyRecord / savings / net worth', () => {
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
      allocations: {
        emergencyReserve: 100,
        travelFund: 0,
        investments: 0,
      },
      portfolioSnapshot: {
        emergencyReserveBalance: 1000,
        travelFundBalance: 200,
        externalInvestmentsBalance: 3000,
        liquidCashBalance: 500,
      },
    })

    expect(record.computed.leftoverAfterExpenses).toBe(600)
    expect(record.computed.discretionarySurplus).toBe(500)
    // (1000 - 400) / 1000 → Z counts as saved
    expect(savingsRate(record)).toBe(60)
    expect(netWorthFromSnapshot(record.portfolioSnapshot)).toBe(4700)
  })

  it('emptyDraft carries previous portfolio and salaries', () => {
    const previous = buildMonthlyRecord(
      emptyDraft('2026-10', DEFAULT_CATEGORIES),
    )
    previous.inflows.partnerASalary = 2800
    previous.portfolioSnapshot.liquidCashBalance = 1234

    const draft = emptyDraft('2026-11', DEFAULT_CATEGORIES, previous)
    expect(draft.inflows.partnerASalary).toBe(2800)
    expect(draft.portfolioSnapshot.liquidCashBalance).toBe(1234)
    expect(draft.outflows).toHaveLength(DEFAULT_CATEGORIES.length)
  })
})
