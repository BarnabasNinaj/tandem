export interface CategoryExpense {
  categoryId: string
  categoryName: string
  amount: number
}

export interface MonthlyRecord {
  monthKey: string
  updatedAt: string
  inflows: {
    partnerASalary: number
    partnerBIncome: number
    childSupport: number
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
    totalInflow: number
    totalOutflow: number
    discretionarySurplus: number
    personalAllowancePerPartner: number
  }
  notes?: string
}

export interface ExpenseCategory {
  id: string
  name: string
  isDefault: boolean
}

export interface TandemSettings {
  currencySymbol: string
  currencyLocale: string
  dateFormat: 'DD/MM/YYYY'
  emergencyTargetMonths: number
  partnerAName: string
  partnerBName: string
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
