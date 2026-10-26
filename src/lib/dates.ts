import { format, parse, parseISO, isValid } from 'date-fns'

/** Internal month key: YYYY-MM */
export function toMonthKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM')
}

/** UI month label: MM/YYYY (compact — charts, selects, dense rows) */
export function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-')
  if (!y || !m) return monthKey
  return `${m}/${y}`
}

/** UI month title: October 2026 (list headings — words, not digit runs) */
export function formatMonthName(monthKey: string): string {
  const d = monthKeyToDate(monthKey)
  if (!isValid(d)) return monthKey
  return format(d, 'MMMM yyyy')
}

/** UI date: DD/MM/YYYY */
export function formatDateDDMMYYYY(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate
  if (!isValid(d)) return '—'
  return format(d, 'dd/MM/yyyy')
}

/** UI datetime: DD/MM/YYYY HH:mm */
export function formatDateTimeDDMMYYYY(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate
  if (!isValid(d)) return '—'
  return format(d, 'dd/MM/yyyy HH:mm')
}

/** Chart axis: MM/YYYY from month key or ISO */
export function formatChartMonth(value: string): string {
  if (/^\d{4}-\d{2}$/.test(value)) return formatMonthKey(value)
  return formatDateDDMMYYYY(value).slice(3) // MM/YYYY from DD/MM/YYYY
}

export function monthKeyToDate(monthKey: string): Date {
  return parse(`${monthKey}-01`, 'yyyy-MM-dd', new Date())
}

export function parseMonthInput(yyyyMm: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return null
  const d = monthKeyToDate(yyyyMm)
  return isValid(d) ? yyyyMm : null
}

export function listRecentMonthKeys(count = 24): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(toMonthKey(d))
  }
  return keys
}
