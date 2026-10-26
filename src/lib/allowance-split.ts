import type { AllowanceSplit } from '@/types/tandem'

/** Household split presets shown in Settings + Track. */
export const ALLOWANCE_SPLIT_OPTIONS: {
  id: AllowanceSplit
  label: string
  shortLabel: string
}[] = [
  { id: 'equal', label: '50/50', shortLabel: '50/50' },
  { id: 'income', label: 'By income', shortLabel: 'Income' },
  {
    id: 'incomeEqualNet',
    label: 'Income · equal Net',
    shortLabel: 'Inc · eq',
  },
]
