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
  allocations: MonthlyRecord['allocations']
  portfolioSnapshot: MonthlyRecord['portfolioSnapshot']
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

export function sumAllocations(
  allocations: MonthlyRecord['allocations'],
): number {
  return round2(
    allocations.emergencyReserve +
      allocations.travelFund +
      allocations.investments,
  )
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
 *   Toggle splits Y (expense shares) and pocket = Z − allocations.
 */
export function computeMonthly(
  inflows: MonthlyRecord['inflows'],
  outflows: CategoryExpense[],
  allocations: MonthlyRecord['allocations'],
  allowanceSplit: AllowanceSplit = 'equal',
): MonthlyRecord['computed'] {
  const totalInflow = sumInflows(inflows)
  const totalOutflow = sumOutflows(outflows)
  const leftoverAfterExpenses = round2(totalInflow - totalOutflow)
  const offPlatform = sumAllocations(allocations)
  const discretionarySurplus = round2(leftoverAfterExpenses - offPlatform)

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
    draft.allocations,
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
    allocations: {
      emergencyReserve: round2(draft.allocations.emergencyReserve),
      travelFund: round2(draft.allocations.travelFund),
      investments: round2(draft.allocations.investments),
    },
    portfolioSnapshot: {
      emergencyReserveBalance: round2(
        draft.portfolioSnapshot.emergencyReserveBalance,
      ),
      travelFundBalance: round2(draft.portfolioSnapshot.travelFundBalance),
      externalInvestmentsBalance: round2(
        draft.portfolioSnapshot.externalInvestmentsBalance,
      ),
      liquidCashBalance: round2(draft.portfolioSnapshot.liquidCashBalance),
    },
    computed,
    notes: draft.notes?.trim() || undefined,
  }
}

export function netWorthFromSnapshot(
  snap: MonthlyRecord['portfolioSnapshot'],
): number {
  return round2(
    snap.liquidCashBalance +
      snap.emergencyReserveBalance +
      snap.travelFundBalance +
      snap.externalInvestmentsBalance,
  )
}

export function savingsRate(record: MonthlyRecord): number {
  if (record.computed.totalInflow <= 0) return 0
  // Net savings = inflow − expenses (allocations count as saved; from Z)
  const netSaved = round2(
    record.computed.totalInflow - record.computed.totalOutflow,
  )
  return round2((netSaved / record.computed.totalInflow) * 100)
}

export function emergencyMonthsCovered(
  balance: number,
  averageMonthlyOutflow: number,
): number {
  if (averageMonthlyOutflow <= 0) return 0
  return round2(balance / averageMonthlyOutflow)
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
    allocations: {
      emergencyReserve: 0,
      travelFund: 0,
      investments: 0,
    },
    portfolioSnapshot: previous
      ? { ...previous.portfolioSnapshot }
      : {
          emergencyReserveBalance: 0,
          travelFundBalance: 0,
          externalInvestmentsBalance: 0,
          liquidCashBalance: 0,
        },
  }
}
