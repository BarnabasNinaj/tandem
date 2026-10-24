import {
  DEFAULT_CATEGORIES,
  type AllowanceSplit,
  type BankCategoryMapping,
  type CardOwner,
  type ExpenseCard,
  type MonthlyRecord,
  type TandemState,
} from '@/types/tandem'
import { generateSalt } from './crypto'
import { buildDemoHistory } from './demo-data'
import { computeMonthly } from './finance'
import { CURRENCY_LOCALE, CURRENCY_SYMBOL, round2 } from './number'

type AnyState = Record<string, unknown>

type LegacyInflows = {
  partnerASalary?: number
  partnerBIncome?: number
  /** Removed — folded into otherInflows. */
  childSupport?: number
  otherInflows?: number
}

export function migrateState(raw: unknown): TandemState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid vault payload.')
  }
  const data = raw as AnyState
  const version = data.version

  if (version === '1.0') {
    return normalizeV1(data as unknown as TandemState)
  }

  // Future versions: chain migrations here
  // if (version === '1.1') { ... }

  throw new Error(`Unsupported vault version: ${String(version)}`)
}

/** Three inflow buckets only; legacy childSupport merges into other. */
export function normalizeInflows(
  raw: LegacyInflows | undefined,
): MonthlyRecord['inflows'] {
  const partnerASalary = round2(raw?.partnerASalary ?? 0)
  const partnerBIncome = round2(raw?.partnerBIncome ?? 0)
  const otherInflows = round2(
    (raw?.otherInflows ?? 0) + (raw?.childSupport ?? 0),
  )
  return { partnerASalary, partnerBIncome, otherInflows }
}

function normalizeAllowanceSplit(raw: unknown): AllowanceSplit {
  return raw === 'income' ? 'income' : 'equal'
}

function normalizeHistory(
  history: Record<string, MonthlyRecord> | undefined,
  allowanceSplit: AllowanceSplit,
): Record<string, MonthlyRecord> {
  if (!history) return {}
  const next: Record<string, MonthlyRecord> = {}
  for (const [key, record] of Object.entries(history)) {
    const inflows = normalizeInflows(
      record.inflows as LegacyInflows | undefined,
    )
    const outflows = record.outflows ?? []
    const allocations = record.allocations ?? {
      emergencyReserve: 0,
      travelFund: 0,
      investments: 0,
    }
    const split = normalizeAllowanceSplit(
      record.computed?.allowanceSplit ?? allowanceSplit,
    )
    next[key] = {
      ...record,
      monthKey: record.monthKey || key,
      inflows,
      computed: computeMonthly(inflows, outflows, allocations, split),
    }
  }
  return next
}

function partnerName(
  value: string | undefined,
  legacyDefault: string,
  nextDefault: string,
): string {
  if (!value || value === legacyDefault) return nextDefault
  return value
}

function normalizeCardOwner(raw: unknown): CardOwner | null {
  if (raw === 'partnerA' || raw === 'partnerB' || raw === 'common') return raw
  return null
}

function normalizeCards(raw: unknown): ExpenseCard[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c) => {
      if (!c || typeof c !== 'object') return null
      const row = c as ExpenseCard
      const owner = normalizeCardOwner(row.owner)
      if (typeof row.id !== 'string' || typeof row.name !== 'string' || !owner) {
        return null
      }
      return {
        id: row.id,
        name: row.name.trim() || 'Card',
        owner,
      } satisfies ExpenseCard
    })
    .filter((c): c is ExpenseCard => c !== null)
}

function normalizeCategoryMappings(raw: unknown): BankCategoryMapping[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: BankCategoryMapping[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const m = row as BankCategoryMapping
    if (
      typeof m.key !== 'string' ||
      typeof m.label !== 'string' ||
      typeof m.categoryId !== 'string'
    ) {
      continue
    }
    const key = m.key.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({
      key,
      label: m.label.trim() || key,
      categoryId: m.categoryId,
    })
  }
  return out
}

function normalizeV1(state: TandemState): TandemState {
  const allowanceSplit = normalizeAllowanceSplit(
    state.settings?.allowanceSplit,
  )
  return {
    version: '1.0',
    updatedAt: state.updatedAt || new Date().toISOString(),
    salt: state.salt || generateSalt(),
    settings: {
      // Money is always EUR; ignore any legacy vault overrides.
      currencySymbol: CURRENCY_SYMBOL,
      currencyLocale: CURRENCY_LOCALE,
      dateFormat: 'DD/MM/YYYY',
      emergencyTargetMonths: state.settings?.emergencyTargetMonths ?? 6,
      partnerAName: partnerName(
        state.settings?.partnerAName,
        'Partner A',
        'Barney',
      ),
      partnerBName: partnerName(
        state.settings?.partnerBName,
        'Partner B',
        'Lucka',
      ),
      allowanceSplit,
      categories:
        state.settings?.categories?.length > 0
          ? state.settings.categories
          : DEFAULT_CATEGORIES,
      cards: normalizeCards(state.settings?.cards),
      categoryMappings: normalizeCategoryMappings(
        state.settings?.categoryMappings,
      ),
      autoLockMinutes: state.settings?.autoLockMinutes ?? 30,
    },
    history: normalizeHistory(state.history, allowanceSplit),
  }
}

export function createInitialState(partial?: {
  partnerAName?: string
  partnerBName?: string
  salt?: string
  withDemoData?: boolean
}): TandemState {
  return {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    salt: partial?.salt || generateSalt(),
    settings: {
      currencySymbol: CURRENCY_SYMBOL,
      currencyLocale: CURRENCY_LOCALE,
      dateFormat: 'DD/MM/YYYY',
      emergencyTargetMonths: 6,
      partnerAName: partial?.partnerAName || 'Barney',
      partnerBName: partial?.partnerBName || 'Lucka',
      allowanceSplit: 'equal',
      categories: [...DEFAULT_CATEGORIES],
      cards: [],
      categoryMappings: [],
      autoLockMinutes: 30,
    },
    // Production vaults start empty; H1 samples via Settings loadDemoData / clearDemoData
    // or explicit withDemoData: true (tests / intentional seed).
    history: partial?.withDemoData === true ? buildDemoHistory() : {},
  }
}
