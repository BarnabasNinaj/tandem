import { parseLocaleNumber, round2 } from './number'
import type {
  BankCategoryMapping,
  CategoryExpense,
  ExpenseCategory,
} from '@/types/tandem'

/** Normalize a bank/card category label for mapping lookup. */
export function normalizeBankLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase()
}

export interface ParsedCardLine {
  label: string
  key: string
  amount: number
}

/**
 * Parse monthly category totals pasted from a card statement.
 * Accepts lines like:
 *   Groceries 120,50
 *   Restaurant\t45
 *   Fuel; 60
 *   Dining: 12.3
 */
export function parseCardPaste(text: string): ParsedCardLine[] {
  const lines = text.split(/\r?\n/)
  const out: ParsedCardLine[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // label + amount separated by tab, semicolon, colon, or last whitespace run
    let label = ''
    let amountRaw = ''
    const tab = line.match(/^(.+?)\t+(.+)$/)
    const semi = line.match(/^(.+?)\s*;\s*(.+)$/)
    const colon = line.match(/^(.+?)\s*:\s*(.+)$/)
    const space = line.match(/^(.+?)\s+([€$]?\s*-?[\d\s]+[,.]?\d*)\s*$/)

    if (tab) {
      label = tab[1]!.trim()
      amountRaw = tab[2]!.trim()
    } else if (semi) {
      label = semi[1]!.trim()
      amountRaw = semi[2]!.trim()
    } else if (colon) {
      label = colon[1]!.trim()
      amountRaw = colon[2]!.trim()
    } else if (space) {
      label = space[1]!.trim()
      amountRaw = space[2]!.trim()
    } else {
      continue
    }

    amountRaw = amountRaw.replace(/^[€$]\s*/, '')
    const amount = parseLocaleNumber(amountRaw)
    const key = normalizeBankLabel(label)
    if (!key || amount === 0) continue

    // Collapse duplicate labels in one paste (sum)
    const existing = out.find((r) => r.key === key)
    if (existing) {
      existing.amount = round2(existing.amount + amount)
      existing.label = label
    } else {
      out.push({ label, key, amount })
    }
  }
  return out
}

export interface MappedCardLine extends ParsedCardLine {
  categoryId: string | null
  categoryName: string | null
}

export function mapCardLines(
  lines: ParsedCardLine[],
  mappings: BankCategoryMapping[],
  categories: ExpenseCategory[],
): MappedCardLine[] {
  const byKey = new Map(mappings.map((m) => [m.key, m]))
  const catById = new Map(categories.map((c) => [c.id, c]))
  return lines.map((line) => {
    const hit = byKey.get(line.key)
    const cat = hit ? catById.get(hit.categoryId) : undefined
    return {
      ...line,
      categoryId: cat?.id ?? null,
      categoryName: cat?.name ?? null,
    }
  })
}

/** Upsert mapping rules from confirmed card lines. */
export function upsertMappings(
  existing: BankCategoryMapping[],
  lines: Array<{ key: string; label: string; categoryId: string }>,
): BankCategoryMapping[] {
  const map = new Map(existing.map((m) => [m.key, { ...m }]))
  for (const line of lines) {
    const key = normalizeBankLabel(line.key || line.label)
    if (!key || !line.categoryId) continue
    map.set(key, {
      key,
      label: line.label.trim() || key,
      categoryId: line.categoryId,
    })
  }
  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
}

/**
 * Add mapped card amounts into the month’s outflows (merge, don’t replace).
 * Unmapped lines are skipped.
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
