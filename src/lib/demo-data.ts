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
 * - A salary wobbles month to month (OT / quiet weeks) plus Apr/Dec bonuses; B mid-year leave then recovery
 * - Several months finish **negative** (spend > income) — summer travel, back-to-school, Dec gifts
 * - Strong surplus months in spring / autumn for contrast
 * - Other = gifts, refunds, side work (sporadic)
 * - Winter utilities high; summer dining / transport up; Dec holiday spike
 */
const YEAR_SPECS: MonthSpec[] = [
  {
    monthKey: '2026-01',
    partnerASalary: 2520,
    partnerBIncome: 2320,
    otherInflows: 0,
    housing: 940,
    groceries: 380,
    kids: 95,
    subscriptions: 58,
    dining: 55,
    transport: 95,
    utilities: 185,
    investments: 400,
    misc: 28,
    label: 'January',
    note: 'Lean spend after holidays — solid surplus',
  },
  {
    monthKey: '2026-02',
    partnerASalary: 2810,
    partnerBIncome: 2320,
    otherInflows: 280,
    housing: 940,
    groceries: 310,
    kids: 80,
    subscriptions: 58,
    dining: 70,
    transport: 85,
    utilities: 170,
    investments: 400,
    misc: 22,
    label: 'February',
    note: 'Short month + tax refund in Other — strongest surplus',
  },
  {
    monthKey: '2026-03',
    partnerASalary: 2380,
    partnerBIncome: 1650,
    otherInflows: 0,
    housing: 940,
    groceries: 560,
    kids: 680,
    subscriptions: 72,
    dining: 340,
    transport: 450,
    utilities: 155,
    investments: 150,
    misc: 890,
    label: 'March',
    note: 'Kids gear + weekend trips + appliance repair — deficit',
  },
  {
    monthKey: '2026-04',
    partnerASalary: 3600,
    partnerBIncome: 1950,
    otherInflows: 0,
    housing: 1020,
    groceries: 365,
    kids: 140,
    subscriptions: 65,
    dining: 95,
    transport: 120,
    utilities: 125,
    investments: 600,
    misc: 40,
    label: 'April',
    note: 'A bonus month; rent step-up; big surplus',
  },
  {
    monthKey: '2026-05',
    partnerASalary: 2690,
    partnerBIncome: 1450,
    otherInflows: 0,
    housing: 1020,
    groceries: 430,
    kids: 210,
    subscriptions: 78,
    dining: 195,
    transport: 220,
    utilities: 110,
    investments: 350,
    misc: 85,
    label: 'May',
    note: 'B income dip starts; spring dining up — still ahead',
  },
  {
    monthKey: '2026-06',
    partnerASalary: 2910,
    partnerBIncome: 550,
    otherInflows: 100,
    housing: 1020,
    groceries: 520,
    kids: 380,
    subscriptions: 78,
    dining: 380,
    transport: 460,
    utilities: 95,
    investments: 100,
    misc: 420,
    label: 'June',
    note: 'Leave starts; holiday prep overshoots income',
  },
  {
    monthKey: '2026-07',
    partnerASalary: 2480,
    partnerBIncome: 350,
    otherInflows: 0,
    housing: 1020,
    groceries: 640,
    kids: 420,
    subscriptions: 78,
    dining: 580,
    transport: 920,
    utilities: 88,
    investments: 0,
    misc: 480,
    label: 'July',
    note: 'Peak summer travel — deepest deficit of the year',
  },
  {
    monthKey: '2026-08',
    partnerASalary: 2730,
    partnerBIncome: 350,
    otherInflows: 80,
    housing: 1020,
    groceries: 560,
    kids: 390,
    subscriptions: 82,
    dining: 450,
    transport: 610,
    utilities: 90,
    investments: 0,
    misc: 280,
    label: 'August',
    note: 'Still on leave; travel hangover — second deficit',
  },
  {
    monthKey: '2026-09',
    partnerASalary: 2590,
    partnerBIncome: 750,
    otherInflows: 0,
    housing: 1020,
    groceries: 490,
    kids: 920,
    subscriptions: 88,
    dining: 175,
    transport: 210,
    utilities: 125,
    investments: 150,
    misc: 280,
    label: 'September',
    note: 'Back-to-school kids spend; B recovering — still red',
  },
  {
    monthKey: '2026-10',
    partnerASalary: 3080,
    partnerBIncome: 2050,
    otherInflows: 40,
    housing: 1020,
    groceries: 370,
    kids: 160,
    subscriptions: 82,
    dining: 90,
    transport: 130,
    utilities: 145,
    investments: 500,
    misc: 45,
    label: 'October',
    note: 'Steady autumn bounce-back — surplus returns',
  },
  {
    monthKey: '2026-11',
    partnerASalary: 2860,
    partnerBIncome: 2200,
    otherInflows: 0,
    housing: 1020,
    groceries: 540,
    kids: 260,
    subscriptions: 95,
    dining: 340,
    transport: 180,
    utilities: 185,
    investments: 450,
    misc: 480,
    label: 'November',
    note: 'Black-Friday haul — thin surplus',
  },
  {
    monthKey: '2026-12',
    partnerASalary: 3700,
    partnerBIncome: 2100,
    otherInflows: 150,
    housing: 1020,
    groceries: 860,
    kids: 820,
    subscriptions: 95,
    dining: 680,
    transport: 310,
    utilities: 220,
    investments: 300,
    misc: 1680,
    label: 'December',
    note: 'Year-end bonus + gifts still overshoot — holiday deficit',
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
