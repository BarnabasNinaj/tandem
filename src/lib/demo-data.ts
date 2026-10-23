import { buildMonthlyRecord } from './finance'
import { DEFAULT_CATEGORIES, type MonthlyRecord } from '@/types/tandem'

/** Two sample closed months (Sep + Oct 2026) for exploring Home & Trajectory. */
export function buildDemoHistory(): Record<string, MonthlyRecord> {
  const cats = DEFAULT_CATEGORIES

  const september = buildMonthlyRecord({
    monthKey: '2026-09',
    inflows: {
      partnerASalary: 2800,
      partnerBIncome: 2100,
      childSupport: 320,
      otherInflows: 50,
    },
    outflows: [
      { categoryId: cats[0]!.id, categoryName: cats[0]!.name, amount: 950 },
      { categoryId: cats[1]!.id, categoryName: cats[1]!.name, amount: 420 },
      { categoryId: cats[2]!.id, categoryName: cats[2]!.name, amount: 180 },
      { categoryId: cats[3]!.id, categoryName: cats[3]!.name, amount: 65 },
      { categoryId: cats[4]!.id, categoryName: cats[4]!.name, amount: 140 },
      { categoryId: cats[5]!.id, categoryName: cats[5]!.name, amount: 210 },
      { categoryId: cats[6]!.id, categoryName: cats[6]!.name, amount: 160 },
      { categoryId: cats[7]!.id, categoryName: cats[7]!.name, amount: 85 },
    ],
    allocations: {
      emergencyReserve: 200,
      travelFund: 150,
      investments: 300,
    },
    portfolioSnapshot: {
      emergencyReserveBalance: 4200,
      travelFundBalance: 900,
      externalInvestmentsBalance: 12500,
      liquidCashBalance: 1800,
    },
    notes: 'Sample September close — demo data',
  })

  const october = buildMonthlyRecord({
    monthKey: '2026-10',
    inflows: {
      partnerASalary: 2800,
      partnerBIncome: 2250,
      childSupport: 320,
      otherInflows: 0,
    },
    outflows: [
      { categoryId: cats[0]!.id, categoryName: cats[0]!.name, amount: 950 },
      { categoryId: cats[1]!.id, categoryName: cats[1]!.name, amount: 390 },
      { categoryId: cats[2]!.id, categoryName: cats[2]!.name, amount: 200 },
      { categoryId: cats[3]!.id, categoryName: cats[3]!.name, amount: 65 },
      { categoryId: cats[4]!.id, categoryName: cats[4]!.name, amount: 125 },
      { categoryId: cats[5]!.id, categoryName: cats[5]!.name, amount: 175 },
      { categoryId: cats[6]!.id, categoryName: cats[6]!.name, amount: 155 },
      { categoryId: cats[7]!.id, categoryName: cats[7]!.name, amount: 40 },
    ],
    allocations: {
      emergencyReserve: 250,
      travelFund: 100,
      investments: 350,
    },
    portfolioSnapshot: {
      emergencyReserveBalance: 4450,
      travelFundBalance: 1000,
      externalInvestmentsBalance: 13100,
      liquidCashBalance: 2100,
    },
    notes: 'Sample October close — demo data',
  })

  // Stable timestamps so UI dates look intentional
  september.updatedAt = '2026-09-30T20:15:00.000Z'
  october.updatedAt = '2026-10-23T18:00:00.000Z'

  return {
    '2026-09': september,
    '2026-10': october,
  }
}
