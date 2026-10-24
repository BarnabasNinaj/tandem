import { buildMonthlyRecord } from './finance'
import { DEFAULT_CATEGORIES, type MonthlyRecord } from '@/types/tandem'

/** Current sample pack: full H1 2026 (Jan–Jun). */
export const DEMO_MONTH_KEYS = [
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
] as const

/** Older sample keys — stripped on load/clear so Sep/Oct demos do not linger. */
export const LEGACY_DEMO_MONTH_KEYS = ['2026-09', '2026-10'] as const

export const ALL_DEMO_MONTH_KEYS = [
  ...DEMO_MONTH_KEYS,
  ...LEGACY_DEMO_MONTH_KEYS,
] as const

type MonthSpec = {
  monthKey: (typeof DEMO_MONTH_KEYS)[number]
  partnerBIncome: number
  otherInflows: number
  groceries: number
  dining: number
  transport: number
  entertainment: number
  shopping: number
  emergencyReserve: number
  travelFund: number
  investments: number
  /** End-of-month balances after that month’s allocations. */
  emergencyReserveBalance: number
  travelFundBalance: number
  externalInvestmentsBalance: number
  liquidCashBalance: number
  label: string
}

/**
 * Synthetic H1 2026 closes for exploring Home, History, Incomes, Expenses & Outlook.
 * Numbers are fictional — never real household data.
 */
const H1_SPECS: MonthSpec[] = [
  {
    monthKey: '2026-01',
    partnerBIncome: 2100,
    otherInflows: 0,
    groceries: 380,
    dining: 160,
    transport: 140,
    entertainment: 90,
    shopping: 120,
    emergencyReserve: 200,
    travelFund: 100,
    investments: 250,
    emergencyReserveBalance: 3200,
    travelFundBalance: 600,
    externalInvestmentsBalance: 11200,
    liquidCashBalance: 1600,
    label: 'January',
  },
  {
    monthKey: '2026-02',
    partnerBIncome: 2100,
    otherInflows: 80,
    groceries: 360,
    dining: 145,
    transport: 135,
    entertainment: 70,
    shopping: 95,
    emergencyReserve: 200,
    travelFund: 100,
    investments: 250,
    emergencyReserveBalance: 3400,
    travelFundBalance: 700,
    externalInvestmentsBalance: 11550,
    liquidCashBalance: 1750,
    label: 'February',
  },
  {
    monthKey: '2026-03',
    partnerBIncome: 2200,
    otherInflows: 0,
    groceries: 400,
    dining: 180,
    transport: 150,
    entertainment: 110,
    shopping: 160,
    emergencyReserve: 250,
    travelFund: 150,
    investments: 300,
    emergencyReserveBalance: 3650,
    travelFundBalance: 850,
    externalInvestmentsBalance: 12000,
    liquidCashBalance: 1900,
    label: 'March',
  },
  {
    monthKey: '2026-04',
    partnerBIncome: 2200,
    otherInflows: 40,
    groceries: 390,
    dining: 170,
    transport: 145,
    entertainment: 85,
    shopping: 130,
    emergencyReserve: 250,
    travelFund: 150,
    investments: 300,
    emergencyReserveBalance: 3900,
    travelFundBalance: 1000,
    externalInvestmentsBalance: 12450,
    liquidCashBalance: 2000,
    label: 'April',
  },
  {
    monthKey: '2026-05',
    partnerBIncome: 2250,
    otherInflows: 0,
    groceries: 410,
    dining: 195,
    transport: 155,
    entertainment: 100,
    shopping: 140,
    emergencyReserve: 250,
    travelFund: 120,
    investments: 350,
    emergencyReserveBalance: 4150,
    travelFundBalance: 1120,
    externalInvestmentsBalance: 12900,
    liquidCashBalance: 2050,
    label: 'May',
  },
  {
    monthKey: '2026-06',
    partnerBIncome: 2250,
    otherInflows: 100,
    groceries: 420,
    dining: 210,
    transport: 160,
    entertainment: 130,
    shopping: 175,
    emergencyReserve: 300,
    travelFund: 150,
    investments: 350,
    emergencyReserveBalance: 4450,
    travelFundBalance: 1270,
    externalInvestmentsBalance: 13400,
    liquidCashBalance: 2200,
    label: 'June',
  },
]

function lastDayIso(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const last = new Date(Date.UTC(y!, m!, 0, 20, 15, 0))
  return last.toISOString()
}

export function buildDemoHistory(): Record<string, MonthlyRecord> {
  const cats = DEFAULT_CATEGORIES
  const history: Record<string, MonthlyRecord> = {}

  for (const spec of H1_SPECS) {
    const record = buildMonthlyRecord({
      monthKey: spec.monthKey,
      inflows: {
        partnerASalary: 2800,
        partnerBIncome: spec.partnerBIncome,
        otherInflows: spec.otherInflows + 320,
      },
      outflows: [
        { categoryId: cats[0]!.id, categoryName: cats[0]!.name, amount: 950 },
        {
          categoryId: cats[1]!.id,
          categoryName: cats[1]!.name,
          amount: spec.groceries,
        },
        {
          categoryId: cats[2]!.id,
          categoryName: cats[2]!.name,
          amount: spec.dining,
        },
        { categoryId: cats[3]!.id, categoryName: cats[3]!.name, amount: 65 },
        {
          categoryId: cats[4]!.id,
          categoryName: cats[4]!.name,
          amount: spec.transport,
        },
        {
          categoryId: cats[5]!.id,
          categoryName: cats[5]!.name,
          amount: spec.entertainment,
        },
        {
          categoryId: cats[6]!.id,
          categoryName: cats[6]!.name,
          amount: spec.shopping,
        },
        { categoryId: cats[7]!.id, categoryName: cats[7]!.name, amount: 55 },
      ],
      allocations: {
        emergencyReserve: spec.emergencyReserve,
        travelFund: spec.travelFund,
        investments: spec.investments,
      },
      portfolioSnapshot: {
        emergencyReserveBalance: spec.emergencyReserveBalance,
        travelFundBalance: spec.travelFundBalance,
        externalInvestmentsBalance: spec.externalInvestmentsBalance,
        liquidCashBalance: spec.liquidCashBalance,
      },
      notes: `Sample ${spec.label} close — demo data (H1 2026)`,
    })
    record.updatedAt = lastDayIso(spec.monthKey)
    history[spec.monthKey] = record
  }

  return history
}

/** Drop current + legacy sample month keys; leave real months untouched. */
export function stripDemoMonths(
  history: Record<string, MonthlyRecord>,
): Record<string, MonthlyRecord> {
  const next = { ...history }
  for (const key of ALL_DEMO_MONTH_KEYS) {
    delete next[key]
  }
  return next
}
