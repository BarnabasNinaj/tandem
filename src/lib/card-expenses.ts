import { round2 } from './number'
import type {
  BankCategoryMapping,
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
 * Zero amounts are skipped.
 */
export function mergeCardLinesIntoOutflows(
  outflows: CategoryExpense[],
  lines: Array<{ categoryId: string; amount: number }>,
  categories: ExpenseCategory[],
): CategoryExpense[] {
  const amounts = new Map(
    outflows.map((o) => [o.categoryId, o.amount] as const),
  )
  for (const line of lines) {
    if (!line.categoryId || line.amount === 0) continue
    amounts.set(
      line.categoryId,
      round2((amounts.get(line.categoryId) ?? 0) + line.amount),
    )
  }
  return categories.map((c) => {
    const prev = outflows.find((o) => o.categoryId === c.id)
    return {
      categoryId: c.id,
      categoryName: prev?.categoryName ?? c.name,
      amount: amounts.get(c.id) ?? 0,
    }
  })
}
