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
  it('computes surplus and splits personal allowance', () => {
    const computed = computeMonthly(
      {
        partnerASalary: 2000,
        partnerBIncome: 1000,
        childSupport: 0,
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
    )

    expect(computed.totalInflow).toBe(3000)
    expect(computed.totalOutflow).toBe(900)
    expect(computed.discretionarySurplus).toBe(1500)
    expect(computed.personalAllowancePerPartner).toBe(750)
  })
})

describe('buildMonthlyRecord / savings / net worth', () => {
  it('stores computed fields and savings rate', () => {
    const record = buildMonthlyRecord({
      monthKey: '2026-11',
      inflows: {
        partnerASalary: 1000,
        partnerBIncome: 0,
        childSupport: 0,
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

    expect(record.computed.discretionarySurplus).toBe(500)
    // (1000 - 400) / 1000 → allocations count as saved
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
