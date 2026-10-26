/** Always EUR — not user-configurable. */
export const CURRENCY_SYMBOL = '€'

/** Fixed number grouping/decimal style (e.g. `1 234,56`). */
export const CURRENCY_LOCALE = 'sk-SK'

/** Round to 2 decimal places using EPSILON for floating-point safety. */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

/**
 * Parse locale-aware number input accepting both "," and "." as decimals.
 * Thousands separators are stripped when both separators appear.
 */
export function parseLocaleNumber(raw: string): number {
  const trimmed = raw.trim().replace(/\s/g, '')
  if (!trimmed || trimmed === '-' || trimmed === ',' || trimmed === '.') return 0

  const hasComma = trimmed.includes(',')
  const hasDot = trimmed.includes('.')

  let normalized = trimmed
  if (hasComma && hasDot) {
    // Last separator is the decimal mark
    if (trimmed.lastIndexOf(',') > trimmed.lastIndexOf('.')) {
      normalized = trimmed.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = trimmed.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = trimmed.replace(',', '.')
  }

  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? round2(value) : 0
}

export function formatMoney(amount: number): string {
  try {
    const formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
    return `${CURRENCY_SYMBOL}${formatted}`
  } catch {
    return `${CURRENCY_SYMBOL}${round2(amount).toFixed(2)}`
  }
}

/**
 * Copy for a month’s net (income − expenses).
 * `caption` = under a figure; `label` = sentence case (e.g. Track footer).
 */
export function netCaption(
  amount: number,
  style: 'caption' | 'label' = 'caption',
): string {
  const raw = amount < 0 ? 'short this month' : 'left after expenses'
  if (style === 'label') return raw.charAt(0).toUpperCase() + raw.slice(1)
  return raw
}
