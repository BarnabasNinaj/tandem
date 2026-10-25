import { buildMonthlyRecord } from './finance'
import {
  DEFAULT_CATEGORIES,
  type ExpenseCategory,
  type MonthlyRecord,
} from '@/types/tandem'

/** Current sample pack: full calendar year 2026 (Jan–Dec). */
export const DEMO_MONTH_KEYS = [
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
  '2026-07',
  '2026-08',
  '2026-09',
  '2026-10',
  '2026-11',
  '2026-12',
] as const

/**
 * Older sample keys no longer in the pack — still stripped on load/clear
 * so leftover demos from prior packs do not linger. (Empty while pack is FY2026.)
 */
export const LEGACY_DEMO_MONTH_KEYS = [] as const

export const ALL_DEMO_MONTH_KEYS = [
  ...DEMO_MONTH_KEYS,
  ...LEGACY_DEMO_MONTH_KEYS,
] as const

type MonthSpec = {
  monthKey: (typeof DEMO_MONTH_KEYS)[number]
  partnerASalary: number
  partnerBIncome: number
  otherInflows: number
  housing: number
  groceries: number
  kids: number
  subscriptions: number
  dining: number
  transport: number
  utilities: number
  investments: number
  misc: number
  label: string
  note: string
}

/**
 * Synthetic full-year 2026 closes for exploring Track, History, Incomes,
 * Expenses & Outlook. Numbers are fictional — never real household data.
 * Amounts are keyed by category **id** (not list index) so Settings renames stick.
 *
 * Story shape (for chart interest, not realism claims):
 * - Partner A salary mostly steady with Q2 / year-end bumps
 * - Partner B income dips mid-year then recovers
 * - Other = gifts, refunds, side work (sporadic)
 * - Winter utilities high; summer dining / transport up; Dec holiday spike
 */
const YEAR_SPECS: MonthSpec[] = [
  {
    monthKey: '2026-01',
    partnerASalary: 2750,
    partnerBIncome: 2180,
    otherInflows: 0,
    housing: 940,
    groceries: 412,
    kids: 155,
    subscriptions: 62,
    dining: 78,
    transport: 128,
    utilities: 168,
    investments: 350,
    misc: 48,
    label: 'January',
    note: 'Quiet January — heating up, dining down',
  },
  {
    monthKey: '2026-02',
    partnerASalary: 2750,
    partnerBIncome: 2180,
    otherInflows: 120,
    housing: 940,
    groceries: 355,
    kids: 140,
    subscriptions: 62,
    dining: 95,
    transport: 110,
    utilities: 155,
    investments: 350,
    misc: 35,
    label: 'February',
    note: 'Short month + tax-ish refund in Other',
  },
  {
    monthKey: '2026-03',
    partnerASalary: 2800,
    partnerBIncome: 2250,
    otherInflows: 0,
    housing: 940,
    groceries: 438,
    kids: 210,
    subscriptions: 68,
    dining: 142,
    transport: 165,
    utilities: 142,
    investments: 400,
    misc: 88,
    label: 'March',
    note: 'Kids gear + weekend trips',
  },
  {
    monthKey: '2026-04',
    partnerASalary: 3100,
    partnerBIncome: 1900,
    otherInflows: 50,
    housing: 980,
    groceries: 390,
    kids: 175,
    subscriptions: 68,
    dining: 110,
    transport: 148,
    utilities: 118,
    investments: 500,
    misc: 42,
    label: 'April',
    note: 'A bonus month; B hours slightly down; rent step-up',
  },
  {
    monthKey: '2026-05',
    partnerASalary: 2800,
    partnerBIncome: 1650,
    otherInflows: 0,
    housing: 980,
    groceries: 405,
    kids: 190,
    subscriptions: 72,
    dining: 160,
    transport: 188,
    utilities: 105,
    investments: 400,
    misc: 65,
    label: 'May',
    note: 'B income dip starts; spring dining up',
  },
  {
    monthKey: '2026-06',
    partnerASalary: 2800,
    partnerBIncome: 980,
    otherInflows: 200,
    housing: 980,
    groceries: 445,
    kids: 260,
    subscriptions: 72,
    dining: 210,
    transport: 240,
    utilities: 98,
    investments: 300,
    misc: 120,
    label: 'June',
    note: 'Maternity-lean B income; holiday prep + gift in Other',
  },
  {
    monthKey: '2026-07',
    partnerASalary: 2850,
    partnerBIncome: 720,
    otherInflows: 0,
    housing: 980,
    groceries: 520,
    kids: 310,
    subscriptions: 72,
    dining: 285,
    transport: 390,
    utilities: 88,
    investments: 200,
    misc: 175,
    label: 'July',
    note: 'Peak summer travel — transport & dining spike',
  },
  {
    monthKey: '2026-08',
    partnerASalary: 2850,
    partnerBIncome: 720,
    otherInflows: 80,
    housing: 980,
    groceries: 480,
    kids: 295,
    subscriptions: 75,
    dining: 255,
    transport: 320,
    utilities: 92,
    investments: 200,
    misc: 95,
    label: 'August',
    note: 'Still on leave; lighter investments',
  },
  {
    monthKey: '2026-09',
    partnerASalary: 2900,
    partnerBIncome: 1400,
    otherInflows: 0,
    housing: 980,
    groceries: 425,
    kids: 340,
    subscriptions: 79,
    dining: 125,
    transport: 155,
    utilities: 110,
    investments: 450,
    misc: 70,
    label: 'September',
    note: 'Back-to-school kids spend; B income recovering',
  },
  {
    monthKey: '2026-10',
    partnerASalary: 2900,
    partnerBIncome: 1850,
    otherInflows: 35,
    housing: 980,
    groceries: 398,
    kids: 185,
    subscriptions: 79,
    dining: 105,
    transport: 142,
    utilities: 135,
    investments: 500,
    misc: 55,
    label: 'October',
    note: 'Steady autumn; heating starts climbing',
  },
  {
    monthKey: '2026-11',
    partnerASalary: 2950,
    partnerBIncome: 2100,
    otherInflows: 0,
    housing: 980,
    groceries: 455,
    kids: 200,
    subscriptions: 85,
    dining: 168,
    transport: 150,
    utilities: 158,
    investments: 550,
    misc: 110,
    label: 'November',
    note: 'Black-Friday-ish misc; subscriptions bump',
  },
  {
    monthKey: '2026-12',
    partnerASalary: 3400,
    partnerBIncome: 2200,
    otherInflows: 250,
    housing: 980,
    groceries: 580,
    kids: 420,
    subscriptions: 85,
    dining: 320,
    transport: 195,
    utilities: 175,
    investments: 600,
    misc: 280,
    label: 'December',
    note: 'Year-end bonus + gifts — biggest spend month',
  },
]

function lastDayIso(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const last = new Date(Date.UTC(y!, m!, 0, 20, 15, 0))
  return last.toISOString()
}

function catName(categories: ExpenseCategory[], id: string): string {
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
 * Build full-year sample months. Pass current `settings.categories` so renamed
 * labels (e.g. Dining → Restaurants) appear in History / Expenses.
 * Unknown default ids are skipped if the household removed that category.
 */
export function buildDemoHistory(
  categories: ExpenseCategory[] = DEFAULT_CATEGORIES,
): Record<string, MonthlyRecord> {
  const have = new Set(categories.map((c) => c.id))
  const history: Record<string, MonthlyRecord> = {}

  for (const spec of YEAR_SPECS) {
    const amounts: Record<string, number> = {
      housing: spec.housing,
      groceries: spec.groceries,
      kids: spec.kids,
      subscriptions: spec.subscriptions,
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
        partnerASalary: spec.partnerASalary,
        partnerBIncome: spec.partnerBIncome,
        otherInflows: spec.otherInflows,
      },
      outflows,
      notes: `Sample ${spec.label} — ${spec.note} (demo 2026)`,
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
