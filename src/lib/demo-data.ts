import { buildMonthlyRecord } from './finance'
import {
  DEFAULT_CATEGORIES,
  type ExpenseCategory,
  type MonthlyRecord,
} from '@/types/tandem'

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
  kids: number
  dining: number
  transport: number
  utilities: number
  investments: number
  misc: number
  label: string
}

/**
 * Synthetic H1 2026 closes for exploring Track, History, Incomes, Expenses & Outlook.
 * Numbers are fictional — never real household data.
 * Amounts are keyed by category **id** (not list index) so Settings renames stick.
 */
const H1_SPECS: MonthSpec[] = [
  {
    monthKey: '2026-01',
    partnerBIncome: 2100,
    otherInflows: 0,
    groceries: 380,
    kids: 160,
    dining: 90,
    transport: 140,
    utilities: 120,
    investments: 400,
    misc: 55,
    label: 'January',
  },
  {
    monthKey: '2026-02',
    partnerBIncome: 2100,
    otherInflows: 80,
    groceries: 360,
    kids: 145,
    dining: 70,
    transport: 135,
    utilities: 95,
    investments: 400,
    misc: 40,
    label: 'February',
  },
  {
    monthKey: '2026-03',
    partnerBIncome: 2200,
    otherInflows: 0,
    groceries: 400,
    kids: 180,
    dining: 110,
    transport: 150,
    utilities: 160,
    investments: 450,
    misc: 60,
    label: 'March',
  },
  {
    monthKey: '2026-04',
    partnerBIncome: 2200,
    otherInflows: 40,
    groceries: 390,
    kids: 170,
    dining: 85,
    transport: 145,
    utilities: 130,
    investments: 450,
    misc: 50,
    label: 'April',
  },
  {
    monthKey: '2026-05',
    partnerBIncome: 2250,
    otherInflows: 0,
    groceries: 410,
    kids: 195,
    dining: 100,
    transport: 155,
    utilities: 140,
    investments: 500,
    misc: 55,
    label: 'May',
  },
  {
    monthKey: '2026-06',
    partnerBIncome: 2250,
    otherInflows: 100,
    groceries: 420,
    kids: 210,
    dining: 130,
    transport: 160,
    utilities: 175,
    investments: 500,
    misc: 70,
    label: 'June',
  },
]

function lastDayIso(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const last = new Date(Date.UTC(y!, m!, 0, 20, 15, 0))
  return last.toISOString()
}

function catName(
  categories: ExpenseCategory[],
  id: string,
): string {
  return categories.find((c) => c.id === id)?.name ?? id
}

function outflow(
  categories: ExpenseCategory[],
  id: string,
  amount: number,
) {
  return {
    categoryId: id,
    categoryName: catName(categories, id),
    amount,
  }
}

/**
 * Build H1 sample months. Pass current `settings.categories` so renamed
 * labels (e.g. Dining → Restaurants) appear in History / Expenses.
 * Unknown default ids are skipped if the household removed that category.
 */
export function buildDemoHistory(
  categories: ExpenseCategory[] = DEFAULT_CATEGORIES,
): Record<string, MonthlyRecord> {
  const have = new Set(categories.map((c) => c.id))
  const history: Record<string, MonthlyRecord> = {}

  for (const spec of H1_SPECS) {
    const amounts: Record<string, number> = {
      housing: 950,
      groceries: spec.groceries,
      kids: spec.kids,
      subscriptions: 65,
      transport: spec.transport,
      dining: spec.dining,
      utilities: spec.utilities,
      investments: spec.investments,
      misc: spec.misc,
    }
    const outflows = Object.entries(amounts)
      .filter(([id]) => have.has(id))
      .map(([id, amount]) => outflow(categories, id, amount))

    const record = buildMonthlyRecord({
      monthKey: spec.monthKey,
      inflows: {
        partnerASalary: 2800,
        partnerBIncome: spec.partnerBIncome,
        otherInflows: spec.otherInflows + 320,
      },
      outflows,
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
