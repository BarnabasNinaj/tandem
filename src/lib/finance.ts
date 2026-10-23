import { round2 } from './number'
import type {
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
    inflows.partnerASalary +
      inflows.partnerBIncome +
      inflows.childSupport +
      inflows.otherInflows,
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

export function computeMonthly(
  inflows: MonthlyRecord['inflows'],
  outflows: CategoryExpense[],
  allocations: MonthlyRecord['allocations'],
): MonthlyRecord['computed'] {
  const totalInflow = sumInflows(inflows)
  const totalOutflow = sumOutflows(outflows)
  const offPlatform = sumAllocations(allocations)
  const discretionarySurplus = round2(totalInflow - totalOutflow - offPlatform)
  const personalAllowancePerPartner = round2(discretionarySurplus / 2)
  return {
    totalInflow,
    totalOutflow,
    discretionarySurplus,
    personalAllowancePerPartner,
  }
}

export function buildMonthlyRecord(draft: WizardDraft): MonthlyRecord {
  const computed = computeMonthly(
    draft.inflows,
    draft.outflows,
    draft.allocations,
  )
  return {
    monthKey: draft.monthKey,
    updatedAt: new Date().toISOString(),
    inflows: {
      partnerASalary: round2(draft.inflows.partnerASalary),
      partnerBIncome: round2(draft.inflows.partnerBIncome),
      childSupport: round2(draft.inflows.childSupport),
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
  // Net savings = inflow − outflows (allocations count as savings)
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
      childSupport: previous?.inflows.childSupport ?? 0,
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
