import { round2 } from './number'
import type {
  AllowanceSplit,
  CardOwner,
  CategoryExpense,
  MonthlyRecord,
  PaymentByOwner,
  TandemSettings,
  TandemState,
} from '@/types/tandem'

export interface WizardDraft {
  monthKey: string
  inflows: MonthlyRecord['inflows']
  outflows: CategoryExpense[]
  /** Who paid via card entry — bumped on Add to month. */
  paymentByOwner?: PaymentByOwner
  notes?: string
}

export function emptyPaymentByOwner(): PaymentByOwner {
  return { partnerA: 0, partnerB: 0, common: 0 }
}

export function normalizePaymentByOwner(raw: unknown): PaymentByOwner {
  if (!raw || typeof raw !== 'object') return emptyPaymentByOwner()
  const o = raw as Record<string, unknown>
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return {
    partnerA: round2(n(o.partnerA)),
    partnerB: round2(n(o.partnerB)),
    common: round2(n(o.common)),
  }
}

export function paymentByOwnerTotal(p: PaymentByOwner): number {
  return round2(p.partnerA + p.partnerB + p.common)
}

/** Add a card-sheet total to the matching owner bucket. */
export function bumpPaymentByOwner(
  current: PaymentByOwner,
  owner: CardOwner,
  amount: number,
): PaymentByOwner {
  if (amount === 0) return current
  return {
    ...current,
    [owner]: round2(current[owner] + amount),
  }
}

export type SettlementDirection = 'a_to_b' | 'b_to_a' | 'settled'

/**
 * Compare effective card payments (common split like expenses) to fair Pays shares.
 * Positive `netA` ⇒ partner A overpaid ⇒ B → A transfer.
 */
export function settleExpenseShares(
  paymentByOwner: PaymentByOwner,
  inflows: MonthlyRecord['inflows'],
  expenseSharePartnerA: number,
  expenseSharePartnerB: number,
  allowanceSplit: AllowanceSplit,
): {
  hasPaymentData: boolean
  effectivePaidA: number
  effectivePaidB: number
  fairShareA: number
  fairShareB: number
  netA: number
  transferAmount: number
  direction: SettlementDirection
} {
  const hasPaymentData = paymentByOwnerTotal(paymentByOwner) > 0
  const commonSplit = splitByMode(
    paymentByOwner.common,
    inflows,
    allowanceSplit,
  )
  const effectivePaidA = round2(paymentByOwner.partnerA + commonSplit.partnerA)
  const effectivePaidB = round2(paymentByOwner.partnerB + commonSplit.partnerB)
  const netA = round2(effectivePaidA - expenseSharePartnerA)
  if (!hasPaymentData) {
    return {
      hasPaymentData: false,
      effectivePaidA,
      effectivePaidB,
      fairShareA: expenseSharePartnerA,
      fairShareB: expenseSharePartnerB,
      netA: 0,
      transferAmount: 0,
      direction: 'settled',
    }
  }
  const transferAmount = round2(Math.abs(netA))
  let direction: SettlementDirection = 'settled'
  if (transferAmount >= 0.01) {
    direction = netA > 0 ? 'b_to_a' : 'a_to_b'
  }
  return {
    hasPaymentData,
    effectivePaidA,
    effectivePaidB,
    fairShareA: expenseSharePartnerA,
    fairShareB: expenseSharePartnerB,
    netA,
    transferAmount,
    direction,
  }
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

  return {
    totalInflow,
    totalOutflow,
    leftoverAfterExpenses,
    discretionarySurplus,
    expenseSharePartnerA: expenseShares.partnerA,
    expenseSharePartnerB: expenseShares.partnerB,
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
    paymentByOwner: normalizePaymentByOwner(draft.paymentByOwner),
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
    paymentByOwner: emptyPaymentByOwner(),
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
    paymentByOwner: normalizePaymentByOwner(record.paymentByOwner),
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
 * Rewrite every saved month’s outflows to match current categories
 * (refresh names, drop removed ids, add new at €0) and recompute totals.
 * Returns the same `history` reference when nothing changed.
 */
export function alignHistoryToCategories(
  history: Record<string, MonthlyRecord>,
  categories: TandemSettings['categories'],
  allowanceSplit: AllowanceSplit = 'equal',
): Record<string, MonthlyRecord> {
  let changed = false
  const next: Record<string, MonthlyRecord> = {}
  for (const [key, record] of Object.entries(history)) {
    if (outflowsMatchCategories(record.outflows, categories)) {
      next[key] = record
      continue
    }
    changed = true
    const outflows = alignOutflowsToCategories(record.outflows, categories)
    next[key] = {
      ...record,
      outflows,
      computed: computeMonthly(record.inflows, outflows, allowanceSplit),
    }
  }
  return changed ? next : history
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
