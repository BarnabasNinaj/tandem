import { DEFAULT_CATEGORIES, type ExpenseCategory } from '@/types/tandem'

/** Keep household order; append any missing stock defaults (e.g. Investments). */
export function ensureDefaultCategories(
  categories: ExpenseCategory[],
): ExpenseCategory[] {
  if (!categories.length) return [...DEFAULT_CATEGORIES]
  const have = new Set(categories.map((c) => c.id))
  const missing = DEFAULT_CATEGORIES.filter((c) => !have.has(c.id))
  return missing.length ? [...categories, ...missing] : categories
}
