export interface CategoryExpense {
  categoryId: string
  categoryName: string
  amount: number
}

export interface MonthlyRecord {
  monthKey: string
  updatedAt: string
  /** Barney / Lucka / Other — only these three inflow buckets. */
  inflows: {
    partnerASalary: number
    partnerBIncome: number
    otherInflows: number
  }
  outflows: CategoryExpense[]
  allocations: {
    emergencyReserve: number
    travelFund: number
    investments: number
  }
  portfolioSnapshot: {
    emergencyReserveBalance: number
    travelFundBalance: number
    externalInvestmentsBalance: number
    liquidCashBalance: number
  }
  computed: {
    /** X — total incomes */
    totalInflow: number
    /** Y — total expenses */
    totalOutflow: number
    /** Z = X − Y (left after expenses, before allocations) */
    leftoverAfterExpenses: number
    /**
     * Pocket-money pool = Z − allocations.
     * Field name kept for older docs/readers.
     */
    discretionarySurplus: number
    expenseSharePartnerA: number
    expenseSharePartnerB: number
    /** Equal half of the pocket pool (reference). */
    personalAllowancePerPartner: number
    /** Pocket money for each partner after expense split + allocations. */
    personalAllowancePartnerA: number
    personalAllowancePartnerB: number
    allowanceSplit: AllowanceSplit
  }
  notes?: string
}

/** Splits expenses (Y) and pocket money (Z − allocations): 50/50 or by income. */
export type AllowanceSplit = 'equal' | 'income'

export interface ExpenseCategory {
  id: string
  name: string
  isDefault: boolean
}

export interface TandemSettings {
  /** Always `€` — kept in vault for schema stability; not user-editable. */
  currencySymbol: string
  /** Always `sk-SK` number style — not user-editable. */
  currencyLocale: string
  dateFormat: 'DD/MM/YYYY'
  emergencyTargetMonths: number
  partnerAName: string
  partnerBName: string
  /** Splits expenses + pocket: `equal` 50/50, or `income` Barney/Lucka ratio (Other excluded). */
  allowanceSplit: AllowanceSplit
  categories: ExpenseCategory[]
  autoLockMinutes: number
}

export interface TandemState {
  version: '1.0'
  updatedAt: string
  salt: string
  settings: TandemSettings
  history: Record<string, MonthlyRecord>
}

export interface GitHubConfig {
  username: string
  repo: string
  pat: string
  branch?: string
}

export interface EncryptedEnvelope {
  v: 1
  salt: string
  iv: string
  ciphertext: string
}

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'housing', name: 'Housing', isDefault: true },
  { id: 'groceries', name: 'Groceries', isDefault: true },
  { id: 'kids', name: 'Kids', isDefault: true },
  { id: 'subscriptions', name: 'Subscriptions', isDefault: true },
  { id: 'transport', name: 'Transport', isDefault: true },
  { id: 'dining', name: 'Dining/Leisure', isDefault: true },
  { id: 'utilities', name: 'Utilities', isDefault: true },
  { id: 'misc', name: 'Misc', isDefault: true },
]

export const DATA_FILENAME = 'tandem_data.json.enc'
