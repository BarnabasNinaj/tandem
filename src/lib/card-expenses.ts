import { normalizePaymentByOwner } from './finance'
import { round2 } from './number'
import type {
  BankCategoryMapping,
  CardOwner,
  CategoryExpense,
  ExpenseCategory,
} from '@/types/tandem'

/** Normalize a bank category label for mapping lookup. */
export function normalizeBankLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function mappingsForBank(
  mappings: BankCategoryMapping[],
  bankId: string,
): BankCategoryMapping[] {
  return mappings
    .filter((m) => m.bankId === bankId)
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** All bank labels mapped onto one household category (for Settings overview). */
export function mappingsForCategory(
  mappings: BankCategoryMapping[],
  categoryId: string,
): BankCategoryMapping[] {
  return mappings
    .filter((m) => m.categoryId === categoryId)
    .sort((a, b) => {
      const bank = a.bankId.localeCompare(b.bankId)
      return bank !== 0 ? bank : a.label.localeCompare(b.label)
    })
}

/** Upsert mapping rules for one bank from confirmed label lines. */
export function upsertBankMappings(
  existing: BankCategoryMapping[],
  bankId: string,
  lines: Array<{ key?: string; label: string; categoryId: string }>,
): BankCategoryMapping[] {
  const others = existing.filter((m) => m.bankId !== bankId)
  const map = new Map(
    existing
      .filter((m) => m.bankId === bankId)
      .map((m) => [m.key, { ...m }] as const),
  )
  for (const line of lines) {
    const key = normalizeBankLabel(line.key || line.label)
    if (!key || !line.categoryId) continue
    map.set(key, {
      bankId,
      key,
      label: line.label.trim() || key,
      categoryId: line.categoryId,
    })
  }
  return [
    ...others,
    ...Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
  ]
}

/**
 * Add mapped card amounts into the month’s outflows (merge, don’t replace).
 * Zero amounts are skipped. Bumps per-category `paidBy` for the card owner
 * so Investments (and any category) can show partner split from cards used.
 */
export function mergeCardLinesIntoOutflows(
  outflows: CategoryExpense[],
  lines: Array<{ categoryId: string; amount: number }>,
  categories: ExpenseCategory[],
  owner: CardOwner,
): CategoryExpense[] {
  const byId = new Map(outflows.map((o) => [o.categoryId, o] as const))
  for (const line of lines) {
    if (!line.categoryId || line.amount === 0) continue
    const prev = byId.get(line.categoryId)
    const paidBy = normalizePaymentByOwner(prev?.paidBy)
    paidBy[owner] = round2(paidBy[owner] + line.amount)
    byId.set(line.categoryId, {
      categoryId: line.categoryId,
      categoryName: prev?.categoryName ?? '',
      amount: round2((prev?.amount ?? 0) + line.amount),
      paidBy,
    })
  }
  return categories.map((c) => {
    const prev = byId.get(c.id)
    const paidBy = normalizePaymentByOwner(prev?.paidBy)
    const hasPaid =
      paidBy.partnerA > 0 || paidBy.partnerB > 0 || paidBy.common > 0
    return {
      categoryId: c.id,
      categoryName: prev?.categoryName || c.name,
      amount: prev?.amount ?? 0,
      ...(hasPaid ? { paidBy } : {}),
    }
  })
}
