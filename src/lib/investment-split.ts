import { round2 } from './number'
import type { CategoryExpense } from '@/types/tandem'

export const INVESTMENTS_CATEGORY_ID = 'investments'

/** Synthetic ids for chart / table series derived from card `paidBy`. */
export const INVESTMENTS_PARTNER_A_SERIES = 'investments:partnerA'
export const INVESTMENTS_PARTNER_B_SERIES = 'investments:partnerB'
export const INVESTMENTS_COMMON_SERIES = 'investments:common'

export interface DisplayOutflow {
  categoryId: string
  categoryName: string
  amount: number
}

/**
 * Expand the Investments category into separate partner series when card
 * `paidBy` is present — one stored category, two (or three) data points in UI.
 */
export function displayOutflows(
  outflows: CategoryExpense[],
  partnerAName: string,
  partnerBName: string,
): DisplayOutflow[] {
  const out: DisplayOutflow[] = []
  for (const o of outflows) {
    if (o.categoryId !== INVESTMENTS_CATEGORY_ID || !o.paidBy) {
      out.push({
        categoryId: o.categoryId,
        categoryName: o.categoryName,
        amount: o.amount || 0,
      })
      continue
    }
    const paid = o.paidBy
    if (paid.partnerA > 0) {
      out.push({
        categoryId: INVESTMENTS_PARTNER_A_SERIES,
        categoryName: `Investments · ${partnerAName.trim() || 'Partner A'}`,
        amount: paid.partnerA,
      })
    }
    if (paid.partnerB > 0) {
      out.push({
        categoryId: INVESTMENTS_PARTNER_B_SERIES,
        categoryName: `Investments · ${partnerBName.trim() || 'Partner B'}`,
        amount: paid.partnerB,
      })
    }
    if (paid.common > 0) {
      out.push({
        categoryId: INVESTMENTS_COMMON_SERIES,
        categoryName: 'Investments · Common',
        amount: paid.common,
      })
    }
    const attributed = round2(paid.partnerA + paid.partnerB + paid.common)
    const rest = round2((o.amount || 0) - attributed)
    if (rest > 0) {
      out.push({
        categoryId: INVESTMENTS_CATEGORY_ID,
        categoryName: o.categoryName,
        amount: rest,
      })
    }
  }
  return out
}
