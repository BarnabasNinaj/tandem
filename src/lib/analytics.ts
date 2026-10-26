import { formatMonthKey, formatMonthName, toMonthKey } from './dates'
import {
  normalizePaymentByOwner,
  settleExpenseShares,
  type SettlementDirection,
} from './finance'
import { round2 } from './number'
import type { MonthlyRecord } from '@/types/tandem'

export type AnalyticsRange = '3M' | '6M' | '1Y' | 'All'

export function rangeLimit(range: AnalyticsRange, total: number): number {
  if (range === 'All') return total
  if (range === '3M') return 3
  if (range === '6M') return 6
  return 12
}

/** Chronological slice of history for the selected range. */
export function sliceHistory(
  history: Record<string, MonthlyRecord>,
  range: AnalyticsRange,
): MonthlyRecord[] {
  const all = Object.values(history).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
  )
  return all.slice(-rangeLimit(range, all.length))
}

/** Add `delta` calendar months to a `YYYY-MM` key. */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [ys, ms] = monthKey.split('-')
  const y = Number(ys)
  const m = Number(ms)
  if (!y || !m) return monthKey
  const d = new Date(y, m - 1 + delta, 1)
  return toMonthKey(d)
}

/** Ordinary least-squares slope for equally spaced samples (Δ per step). */
export function linearSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  for (let i = 0; i < n; i++) {
    const x = i
    const y = values[i]!
    sumX += x
    sumY += y
    sumXY += x * y
    sumXX += x * x
  }
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return 0
  return (n * sumXY - sumX * sumY) / denom
}

export interface CategoryStats {
  categoryId: string
  categoryName: string
  /** Mean monthly spend across months in range (0 when absent). */
  average: number
  total: number
  /** Months where the category appeared with any amount (incl. 0 rows). */
  months: number
  lastAmount: number
  /** € change per month from linear fit; 0 if &lt; 2 points. */
  slope: number
}

function outflowByCategory(record: MonthlyRecord): Map<string, number> {
  const map = new Map<string, number>()
  for (const o of record.outflows) {
    const key = o.categoryId || o.categoryName
    map.set(key, round2((map.get(key) ?? 0) + (o.amount || 0)))
  }
  return map
}

/** Per-category averages, last amount, and trend slope over the range. */
export function categoryStats(records: MonthlyRecord[]): CategoryStats[] {
  if (records.length === 0) return []

  const meta = new Map<string, { categoryId: string; categoryName: string }>()
  for (const r of records) {
    for (const o of r.outflows) {
      const key = o.categoryId || o.categoryName
      meta.set(key, {
        categoryId: o.categoryId,
        categoryName: o.categoryName,
      })
    }
  }

  const n = records.length
  const perMonth = records.map(outflowByCategory)

  return Array.from(meta.entries())
    .map(([key, m]) => {
      const amounts = perMonth.map((map) => map.get(key) ?? 0)
      const total = round2(amounts.reduce((s, a) => s + a, 0))
      return {
        categoryId: m.categoryId,
        categoryName: m.categoryName,
        average: round2(total / n),
        total,
        months: n,
        lastAmount: amounts[n - 1] ?? 0,
        slope: round2(linearSlope(amounts)),
      }
    })
    .sort((a, b) => b.average - a.average)
}

/** Wide series for multi-line category chart: one row per month. */
export function categoryTrendSeries(
  records: MonthlyRecord[],
  categoryNames: string[],
): Array<Record<string, string | number>> {
  return records.map((r) => {
    const byName = new Map<string, number>()
    for (const o of r.outflows) {
      byName.set(
        o.categoryName,
        round2((byName.get(o.categoryName) ?? 0) + (o.amount || 0)),
      )
    }
    const row: Record<string, string | number> = {
      month: formatMonthKey(r.monthKey),
      monthKey: r.monthKey,
    }
    for (const name of categoryNames) {
      row[name] = byName.get(name) ?? 0
    }
    return row
  })
}

export interface MonthOutlook {
  sampleSize: number
  avgIncome: number
  avgExpense: number
  avgPocket: number
  avgLeftover: number
  avgSavingsRate: number
  /** Sum of pocket (Z) over the range — leftover from tracked data, not bank cash. */
  totalPocket: number
  /** Calendar month being planned (usually "now"). */
  focusMonthKey: string
  focusLabel: string
  /** True when focus month already has a saved record. */
  focusRecorded: boolean
  focusIncome: number | null
  focusExpense: number | null
  focusIncomeDelta: number | null
  focusExpenseDelta: number | null
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0
  return round2(nums.reduce((s, n) => s + n, 0) / nums.length)
}

/**
 * Forward-looking baseline from trailing history.
 * Averages use all `records` (already range-sliced). Focus month is compared
 * to those averages when it is already tracked.
 */
export function buildMonthOutlook(
  records: MonthlyRecord[],
  opts?: { focusMonthKey?: string },
): MonthOutlook | null {
  if (records.length === 0) return null

  const focusMonthKey = opts?.focusMonthKey ?? toMonthKey()
  const focus = records.find((r) => r.monthKey === focusMonthKey)

  const avgIncome = mean(records.map((r) => r.computed.totalInflow))
  const avgExpense = mean(records.map((r) => r.computed.totalOutflow))
  const pockets = records.map((r) => r.computed.discretionarySurplus)
  const avgPocket = mean(pockets)
  const totalPocket = round2(pockets.reduce((s, n) => s + n, 0))
  const avgLeftover = mean(records.map((r) => r.computed.leftoverAfterExpenses))
  const rates = records
    .filter((r) => r.computed.totalInflow > 0)
    .map((r) =>
      round2(
        ((r.computed.totalInflow - r.computed.totalOutflow) /
          r.computed.totalInflow) *
          100,
      ),
    )
  const avgSavingsRate = mean(rates)

  const focusIncome = focus ? focus.computed.totalInflow : null
  const focusExpense = focus ? focus.computed.totalOutflow : null

  return {
    sampleSize: records.length,
    avgIncome,
    avgExpense,
    avgPocket,
    avgLeftover,
    avgSavingsRate,
    totalPocket,
    focusMonthKey,
    focusLabel: formatMonthKey(focusMonthKey),
    focusRecorded: Boolean(focus),
    focusIncome,
    focusExpense,
    focusIncomeDelta:
      focusIncome !== null ? round2(focusIncome - avgIncome) : null,
    focusExpenseDelta:
      focusExpense !== null ? round2(focusExpense - avgExpense) : null,
  }
}

/** One card in the Home Overview scroller. */
export interface HomeMonthSnap {
  monthKey: string
  label: string
  /** recorded actuals · calendar month not saved · next projected from averages */
  status: 'recorded' | 'untracked' | 'projected'
  /** True for the calendar month (scroll focus + highlight). */
  isCalendar: boolean
  income: number | null
  expense: number | null
  leftover: number | null
  /** Partner salaries (Income) — Other excluded. */
  incomeA: number | null
  incomeB: number | null
  /** Fair share of bills (Pays). */
  paysA: number | null
  paysB: number | null
  /** Fair share of leftover (Keeps). */
  pocketA: number | null
  pocketB: number | null
  /** Card-paid vs fair share — only when paymentByOwner has data. */
  settlement: {
    transferAmount: number
    direction: SettlementDirection
  } | null
}

/** Logo Home — chronological tracked months + next-month estimate. */
export interface HomeOverview {
  months: HomeMonthSnap[]
  /** Month key to center on open (calendar month when present). */
  focusMonthKey: string
}

function snapFromRecord(
  record: MonthlyRecord,
  isCalendar: boolean,
): HomeMonthSnap {
  const paymentByOwner = normalizePaymentByOwner(record.paymentByOwner)
  const settled = settleExpenseShares(
    paymentByOwner,
    record.inflows,
    record.computed.expenseSharePartnerA,
    record.computed.expenseSharePartnerB,
    record.computed.allowanceSplit,
  )
  return {
    monthKey: record.monthKey,
    label: formatMonthName(record.monthKey),
    status: 'recorded',
    isCalendar,
    income: record.computed.totalInflow,
    expense: record.computed.totalOutflow,
    leftover: record.computed.leftoverAfterExpenses,
    incomeA: record.inflows.partnerASalary,
    incomeB: record.inflows.partnerBIncome,
    paysA: record.computed.expenseSharePartnerA,
    paysB: record.computed.expenseSharePartnerB,
    pocketA: record.computed.personalAllowancePartnerA,
    pocketB: record.computed.personalAllowancePartnerB,
    settlement: settled.hasPaymentData
      ? {
          transferAmount: settled.transferAmount,
          direction: settled.direction,
        }
      : null,
  }
}

/**
 * Home overview strip: all tracked months (asc), optional untracked calendar
 * month, then next calendar month as a trailing average estimate.
 * Returns null when history is empty.
 */
export function buildHomeOverview(
  history: Record<string, MonthlyRecord>,
  opts?: { focusMonthKey?: string },
): HomeOverview | null {
  const all = Object.values(history).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
  )
  if (all.length === 0) return null

  const calendarMonthKey = opts?.focusMonthKey ?? toMonthKey()
  const nextKey = shiftMonthKey(calendarMonthKey, 1)
  const byKey = new Map(all.map((r) => [r.monthKey, r]))

  const trailing = all.slice(-Math.min(6, all.length))
  const avgIncome = mean(trailing.map((r) => r.computed.totalInflow))
  const avgExpense = mean(trailing.map((r) => r.computed.totalOutflow))
  const avgLeftover = mean(
    trailing.map((r) => r.computed.leftoverAfterExpenses),
  )
  const avgIncomeA = mean(trailing.map((r) => r.inflows.partnerASalary))
  const avgIncomeB = mean(trailing.map((r) => r.inflows.partnerBIncome))
  const avgPaysA = mean(
    trailing.map((r) => r.computed.expenseSharePartnerA),
  )
  const avgPaysB = mean(
    trailing.map((r) => r.computed.expenseSharePartnerB),
  )
  const avgPocketA = mean(
    trailing.map((r) => r.computed.personalAllowancePartnerA),
  )
  const avgPocketB = mean(
    trailing.map((r) => r.computed.personalAllowancePartnerB),
  )

  const months: HomeMonthSnap[] = all.map((r) =>
    snapFromRecord(r, r.monthKey === calendarMonthKey),
  )

  if (!byKey.has(calendarMonthKey)) {
    const untracked: HomeMonthSnap = {
      monthKey: calendarMonthKey,
      label: formatMonthName(calendarMonthKey),
      status: 'untracked',
      isCalendar: true,
      income: null,
      expense: null,
      leftover: null,
      incomeA: null,
      incomeB: null,
      paysA: null,
      paysB: null,
      pocketA: null,
      pocketB: null,
      settlement: null,
    }
    const insertAt = months.findIndex((m) => m.monthKey > calendarMonthKey)
    if (insertAt === -1) months.push(untracked)
    else months.splice(insertAt, 0, untracked)
  }

  if (!months.some((m) => m.monthKey === nextKey)) {
    months.push({
      monthKey: nextKey,
      label: formatMonthName(nextKey),
      status: 'projected',
      isCalendar: false,
      income: avgIncome,
      expense: avgExpense,
      leftover: avgLeftover,
      incomeA: avgIncomeA,
      incomeB: avgIncomeB,
      paysA: avgPaysA,
      paysB: avgPaysB,
      pocketA: avgPocketA,
      pocketB: avgPocketB,
      settlement: null,
    })
  }

  return { months, focusMonthKey: calendarMonthKey }
}

export interface NetPoint {
  month: string
  monthKey: string
  net: number
  cumulative: number
}

/** Month Net (Z) plus running sum over the range. */
export function netOverTime(records: MonthlyRecord[]): {
  points: NetPoint[]
  totalNet: number
} {
  let cumulative = 0
  const points = records.map((r) => {
    const net = r.computed.discretionarySurplus
    cumulative = round2(cumulative + net)
    return {
      month: formatMonthKey(r.monthKey),
      monthKey: r.monthKey,
      net,
      cumulative,
    }
  })
  return { points, totalNet: cumulative }
}

export interface KeepsPoint {
  month: string
  monthKey: string
  partnerA: number
  partnerB: number
}

/** Fair-share leftover (Keeps) per partner over the range. */
export function keepsOverTime(records: MonthlyRecord[]): KeepsPoint[] {
  return records.map((r) => ({
    month: formatMonthKey(r.monthKey),
    monthKey: r.monthKey,
    partnerA: r.computed.personalAllowancePartnerA,
    partnerB: r.computed.personalAllowancePartnerB,
  }))
}

export interface FlowPoint {
  month: string
  monthKey: string
  income: number | null
  expense: number | null
  projectedIncome?: number | null
  projectedExpense?: number | null
  kind: 'actual' | 'projected'
}

/** Income/expense bars plus trailing average projections. */
export function incomeExpenseWithProjection(
  records: MonthlyRecord[],
  projectMonths = 3,
): FlowPoint[] {
  if (records.length === 0) return []
  const avgIncome = mean(records.map((r) => r.computed.totalInflow))
  const avgExpense = mean(records.map((r) => r.computed.totalOutflow))

  const actual: FlowPoint[] = records.map((r) => ({
    month: formatMonthKey(r.monthKey),
    monthKey: r.monthKey,
    income: r.computed.totalInflow,
    expense: r.computed.totalOutflow,
    projectedIncome: null,
    projectedExpense: null,
    kind: 'actual',
  }))

  // Bridge point: last actual also carries projected values for a continuous line
  const last = actual[actual.length - 1]!
  last.projectedIncome = last.income
  last.projectedExpense = last.expense

  let cursor = last.monthKey
  for (let i = 0; i < projectMonths; i++) {
    cursor = shiftMonthKey(cursor, 1)
    actual.push({
      month: formatMonthKey(cursor),
      monthKey: cursor,
      income: null,
      expense: null,
      projectedIncome: avgIncome,
      projectedExpense: avgExpense,
      kind: 'projected',
    })
  }
  return actual
}

export interface IncomeMonth {
  monthKey: string
  label: string
  partnerA: number
  partnerB: number
  other: number
  total: number
}

/** Income buckets only — Barney / Lucka / Other plus the month total. */
export function incomeMonths(records: MonthlyRecord[]): IncomeMonth[] {
  return records.map((r) => ({
    monthKey: r.monthKey,
    label: formatMonthKey(r.monthKey),
    partnerA: r.inflows.partnerASalary,
    partnerB: r.inflows.partnerBIncome,
    other: r.inflows.otherInflows,
    total: r.computed.totalInflow,
  }))
}

export interface IncomeSummary {
  partnerA: number
  partnerB: number
  other: number
  total: number
  avgPartnerA: number
  avgPartnerB: number
  avgOther: number
  avgTotal: number
}

export function summarizeIncomes(rows: IncomeMonth[]): IncomeSummary | null {
  if (rows.length === 0) return null
  const partnerA = round2(rows.reduce((s, r) => s + r.partnerA, 0))
  const partnerB = round2(rows.reduce((s, r) => s + r.partnerB, 0))
  const other = round2(rows.reduce((s, r) => s + r.other, 0))
  const total = round2(rows.reduce((s, r) => s + r.total, 0))
  const n = rows.length
  return {
    partnerA,
    partnerB,
    other,
    total,
    avgPartnerA: round2(partnerA / n),
    avgPartnerB: round2(partnerB / n),
    avgOther: round2(other / n),
    avgTotal: round2(total / n),
  }
}

export interface ExpenseGrid {
  categories: Array<{ id: string; name: string; total: number }>
  rows: Array<{
    monthKey: string
    label: string
    byCategory: Record<string, number>
    total: number
  }>
}

/**
 * Expenses only: categories + per-month amounts.
 * UI table: category rows × month columns (see ExpensesPage).
 */
export function expenseGrid(records: MonthlyRecord[]): ExpenseGrid {
  const totals = new Map<string, { name: string; total: number }>()
  const rows = records.map((r) => {
    const byCategory: Record<string, number> = {}
    for (const o of r.outflows) {
      const id = o.categoryId || o.categoryName
      byCategory[id] = round2((byCategory[id] ?? 0) + (o.amount || 0))
      const prev = totals.get(id)
      totals.set(id, {
        name: o.categoryName,
        total: round2((prev?.total ?? 0) + (o.amount || 0)),
      })
    }
    return {
      monthKey: r.monthKey,
      label: formatMonthKey(r.monthKey),
      byCategory,
      total: r.computed.totalOutflow,
    }
  })

  const categories = Array.from(totals.entries())
    .map(([id, meta]) => ({ id, name: meta.name, total: meta.total }))
    .sort((a, b) => b.total - a.total)

  return { categories, rows }
}
