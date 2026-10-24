import { round2 } from './number'
import type {
  AllowanceSplit,
  CategoryExpense,
  MonthlyRecord,
  TandemSettings,
  TandemState,
} from '@/types/tandem'

export interface WizardDraft {
  monthKey: string
  inflows: MonthlyRecord['inflows']
  outflows: CategoryExpense[]
  notes?: string
}

export function sumInflows(inflows: MonthlyRecord['inflows']): number {
  return round2(
    inflows.partnerASalary + inflows.partnerBIncome + inflows.otherInflows,
  )
}

export function sumOutflows(outflows: CategoryExpense[]): number {
  return round2(outflows.reduce((acc, o) => acc + (o.amount || 0), 0))
}

/**
 * Split an amount by mode.
 * `income` uses Barney:Lucka incomes only (Other excluded from the ratio).
 */
export function splitByMode(
  amount: number,
  inflows: MonthlyRecord['inflows'],
  mode: AllowanceSplit,
): { partnerA: number; partnerB: number } {
  if (mode === 'equal') {
    const each = round2(amount / 2)
    return { partnerA: each, partnerB: each }
  }
  const a = inflows.partnerASalary
  const b = inflows.partnerBIncome
  const earned = a + b
  if (earned <= 0) {
    const each = round2(amount / 2)
    return { partnerA: each, partnerB: each }
  }
  const partnerA = round2((amount * a) / earned)
  const partnerB = round2(amount - partnerA)
  return { partnerA, partnerB }
}

/** @deprecated use splitByMode — kept as alias for call sites/tests. */
export function splitPersonalAllowances(
  surplus: number,
  inflows: MonthlyRecord['inflows'],
  mode: AllowanceSplit,
): { partnerA: number; partnerB: number } {
  return splitByMode(surplus, inflows, mode)
}

/**
 * Product math:
 *   X = incomes, Y = expenses, Z = X − Y
 *   Toggle splits Y (expense shares) and Z (keeps).
 */
export function computeMonthly(
  inflows: MonthlyRecord['inflows'],
  outflows: CategoryExpense[],
  allowanceSplit: AllowanceSplit = 'equal',
): MonthlyRecord['computed'] {
  const totalInflow = sumInflows(inflows)
  const totalOutflow = sumOutflows(outflows)
  const leftoverAfterExpenses = round2(totalInflow - totalOutflow)
  const discretionarySurplus = leftoverAfterExpenses

  const expenseShares = splitByMode(totalOutflow, inflows, allowanceSplit)
  const pocketShares = splitByMode(
    discretionarySurplus,
    inflows,
    allowanceSplit,
  )
  const personalAllowancePerPartner = round2(discretionarySurplus / 2)

  return {
    totalInflow,
    totalOutflow,
    leftoverAfterExpenses,
    discretionarySurplus,
    expenseSharePartnerA: expenseShares.partnerA,
    expenseSharePartnerB: expenseShares.partnerB,
    personalAllowancePerPartner,
    personalAllowancePartnerA: pocketShares.partnerA,
    personalAllowancePartnerB: pocketShares.partnerB,
    allowanceSplit,
  }
}

export function buildMonthlyRecord(
  draft: WizardDraft,
  allowanceSplit: AllowanceSplit = 'equal',
): MonthlyRecord {
  const computed = computeMonthly(
    draft.inflows,
    draft.outflows,
    allowanceSplit,
  )
  return {
    monthKey: draft.monthKey,
    updatedAt: new Date().toISOString(),
    inflows: {
      partnerASalary: round2(draft.inflows.partnerASalary),
      partnerBIncome: round2(draft.inflows.partnerBIncome),
      otherInflows: round2(draft.inflows.otherInflows),
    },
    outflows: draft.outflows.map((o) => ({
      ...o,
      amount: round2(o.amount),
    })),
    computed,
    notes: draft.notes?.trim() || undefined,
  }
}

export function savingsRate(record: MonthlyRecord): number {
  if (record.computed.totalInflow <= 0) return 0
  const netSaved = round2(
    record.computed.totalInflow - record.computed.totalOutflow,
  )
  return round2((netSaved / record.computed.totalInflow) * 100)
}

export function averageMonthlyOutflow(
  history: Record<string, MonthlyRecord>,
  lastN = 3,
): number {
  const records = Object.values(history)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .slice(0, lastN)
  if (records.length === 0) return 0
  const total = records.reduce((s, r) => s + r.computed.totalOutflow, 0)
  return round2(total / records.length)
}

export function getLatestRecord(
  state: TandemState,
): MonthlyRecord | undefined {
  const keys = Object.keys(state.history).sort().reverse()
  return keys[0] ? state.history[keys[0]] : undefined
}

export function emptyOutflows(
  categories: TandemSettings['categories'],
): CategoryExpense[] {
  return categories.map((c) => ({
    categoryId: c.id,
    categoryName: c.name,
    amount: 0,
  }))
}

/**
 * Rebuild outflows to match current household categories.
 * Keeps amounts by categoryId; drops removed ids; adds new ones at 0; refreshes names.
 */
export function alignOutflowsToCategories(
  outflows: CategoryExpense[],
  categories: TandemSettings['categories'],
): CategoryExpense[] {
  const byId = new Map(outflows.map((o) => [o.categoryId, o.amount]))
  return categories.map((c) => ({
    categoryId: c.id,
    categoryName: c.name,
    amount: byId.get(c.id) ?? 0,
  }))
}

function outflowsMatchCategories(
  outflows: CategoryExpense[],
  categories: TandemSettings['categories'],
): boolean {
  if (outflows.length !== categories.length) return false
  return outflows.every(
    (o, i) =>
      o.categoryId === categories[i]?.id &&
      o.categoryName === categories[i]?.name,
  )
}

export function emptyDraft(
  monthKey: string,
  categories: TandemSettings['categories'],
  previous?: MonthlyRecord,
): WizardDraft {
  return {
    monthKey,
    inflows: {
      partnerASalary: previous?.inflows.partnerASalary ?? 0,
      partnerBIncome: previous?.inflows.partnerBIncome ?? 0,
      otherInflows: 0,
    },
    outflows: emptyOutflows(categories),
  }
}

/** Open an already-saved month for edit (aligns outflows to current categories). */
export function draftFromRecord(
  record: MonthlyRecord,
  categories: TandemSettings['categories'],
): WizardDraft {
  return {
    monthKey: record.monthKey,
    inflows: { ...record.inflows },
    outflows: alignOutflowsToCategories(record.outflows, categories),
    notes: record.notes,
  }
}

/** Realign an open draft when Settings categories change (add / remove / rename). */
export function alignDraftToCategories(
  draft: WizardDraft,
  categories: TandemSettings['categories'],
): WizardDraft {
  if (outflowsMatchCategories(draft.outflows, categories)) return draft
  return {
    ...draft,
    outflows: alignOutflowsToCategories(draft.outflows, categories),
  }
}

/**
 * Draft for a month key: load saved record if present, otherwise empty
 * (seeded from the latest prior month when available).
 */
export function draftForMonth(
  history: Record<string, MonthlyRecord>,
  monthKey: string,
  categories: TandemSettings['categories'],
): WizardDraft {
  const existing = history[monthKey]
  if (existing) return draftFromRecord(existing, categories)
  const prior = Object.values(history)
    .filter((r) => r.monthKey < monthKey)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))[0]
  return emptyDraft(monthKey, categories, prior)
}
