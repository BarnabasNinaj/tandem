import {
  DEFAULT_CATEGORIES,
  type AllowanceSplit,
  type BankCategoryMapping,
  type CardOwner,
  type ExpenseBank,
  type ExpenseCard,
  type ExpenseCategory,
  type MonthlyRecord,
  type TandemState,
} from '@/types/tandem'
import { normalizeBankLabel } from './card-expenses'
import { generateSalt } from './crypto'
import { buildDemoHistory } from './demo-data'
import {
  alignHistoryToCategories,
  computeMonthly,
  normalizePaymentByOwner,
} from './finance'
import { CURRENCY_LOCALE, CURRENCY_SYMBOL, round2 } from './number'

/** Keep household order; append any missing stock defaults (e.g. Investments). */
export function ensureDefaultCategories(
  categories: ExpenseCategory[],
): ExpenseCategory[] {
  if (!categories.length) return [...DEFAULT_CATEGORIES]
  const have = new Set(categories.map((c) => c.id))
  const missing = DEFAULT_CATEGORIES.filter((c) => !have.has(c.id))
  return missing.length ? [...categories, ...missing] : categories
}

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
    const split = normalizeAllowanceSplit(
      record.computed?.allowanceSplit ?? allowanceSplit,
    )
    // Drop legacy allocations / portfolioSnapshot if present on older vaults.
    next[key] = {
      monthKey: record.monthKey || key,
      updatedAt: record.updatedAt || new Date().toISOString(),
      inflows,
      outflows,
      paymentByOwner: normalizePaymentByOwner(
        (record as { paymentByOwner?: unknown }).paymentByOwner,
      ),
      computed: computeMonthly(inflows, outflows, split),
      ...(record.notes ? { notes: record.notes } : {}),
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

function normalizeBanks(raw: unknown): ExpenseBank[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: ExpenseBank[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const b = row as ExpenseBank
    if (typeof b.id !== 'string' || typeof b.name !== 'string') continue
    const id = b.id.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({ id, name: b.name.trim() || 'Bank' })
  }
  return out
}

type LegacyCard = Partial<ExpenseCard> & { id?: string; name?: string }
type LegacyMapping = Partial<BankCategoryMapping> & {
  key?: string
  label?: string
  categoryId?: string
  bankId?: string
}

/**
 * Normalize banks, cards, and per-bank mappings.
 * Legacy vaults (cards / global mappings, no banks) get a migrated bank.
 */
function normalizeBanksCardsMappings(
  rawBanks: unknown,
  rawCards: unknown,
  rawMappings: unknown,
): {
  banks: ExpenseBank[]
  cards: ExpenseCard[]
  categoryMappings: BankCategoryMapping[]
} {
  let banks = normalizeBanks(rawBanks)

  const rawCardList = Array.isArray(rawCards) ? rawCards : []
  const parsedCards: Array<{
    id: string
    name: string
    owner: CardOwner
    bankId: string | null
  }> = []
  for (const row of rawCardList) {
    if (!row || typeof row !== 'object') continue
    const c = row as LegacyCard
    const owner = normalizeCardOwner(c.owner)
    if (typeof c.id !== 'string' || typeof c.name !== 'string' || !owner) {
      continue
    }
    const bankId =
      typeof c.bankId === 'string' && c.bankId.trim() ? c.bankId.trim() : null
    parsedCards.push({
      id: c.id,
      name: c.name.trim() || 'Card',
      owner,
      bankId,
    })
  }

  const bankIds = new Set(banks.map((b) => b.id))
  const needsMigrateBank =
    parsedCards.some((c) => !c.bankId || !bankIds.has(c.bankId)) ||
    (parsedCards.length > 0 && banks.length === 0)

  let migrateBankId: string | null = null
  if (needsMigrateBank) {
    migrateBankId =
      banks.find((b) => b.id === 'bank-migrated')?.id ??
      banks[0]?.id ??
      'bank-migrated'
    if (!banks.some((b) => b.id === migrateBankId)) {
      banks = [{ id: migrateBankId, name: 'Bank' }, ...banks]
      bankIds.add(migrateBankId)
    }
  }

  const cards: ExpenseCard[] = parsedCards.map((c) => ({
    id: c.id,
    name: c.name,
    owner: c.owner,
    bankId:
      c.bankId && bankIds.has(c.bankId)
        ? c.bankId
        : (migrateBankId ?? banks[0]!.id),
  }))

  const defaultBankId = banks[0]?.id ?? migrateBankId
  const seen = new Set<string>()
  const categoryMappings: BankCategoryMapping[] = []
  const rawMapList = Array.isArray(rawMappings) ? rawMappings : []
  for (const row of rawMapList) {
    if (!row || typeof row !== 'object') continue
    const m = row as LegacyMapping
    if (
      typeof m.key !== 'string' ||
      typeof m.label !== 'string' ||
      typeof m.categoryId !== 'string'
    ) {
      continue
    }
    const key = normalizeBankLabel(m.key)
    let bankId =
      typeof m.bankId === 'string' && m.bankId.trim() ? m.bankId.trim() : null
    if (!bankId || !bankIds.has(bankId)) {
      if (!defaultBankId) continue
      bankId = defaultBankId
    }
    const dedupe = `${bankId}::${key}`
    if (!key || seen.has(dedupe)) continue
    seen.add(dedupe)
    categoryMappings.push({
      bankId,
      key,
      label: m.label.trim() || key,
      categoryId: m.categoryId,
    })
  }

  return { banks, cards, categoryMappings }
}

function normalizeV1(state: TandemState): TandemState {
  const allowanceSplit = normalizeAllowanceSplit(
    state.settings?.allowanceSplit,
  )
  const categories = ensureDefaultCategories(
    state.settings?.categories?.length > 0
      ? state.settings.categories
      : [...DEFAULT_CATEGORIES],
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
      categories,
      ...normalizeBanksCardsMappings(
        state.settings?.banks,
        state.settings?.cards,
        state.settings?.categoryMappings,
      ),
      autoLockMinutes: state.settings?.autoLockMinutes ?? 30,
    },
    history: alignHistoryToCategories(
      normalizeHistory(state.history, allowanceSplit),
      categories,
      allowanceSplit,
    ),
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
      partnerAName: partial?.partnerAName || 'Barney',
      partnerBName: partial?.partnerBName || 'Lucka',
      allowanceSplit: 'equal',
      categories: [...DEFAULT_CATEGORIES],
      banks: [],
      cards: [],
      categoryMappings: [],
      autoLockMinutes: 30,
    },
    // Production vaults start empty; FY 2026 samples via Settings loadDemoData / clearDemoData
    // or explicit withDemoData: true (tests / intentional seed).
    history: partial?.withDemoData === true ? buildDemoHistory() : {},
  }
}
