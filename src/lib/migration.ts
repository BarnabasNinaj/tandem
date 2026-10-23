import { DEFAULT_CATEGORIES, type TandemState } from '@/types/tandem'
import { generateSalt } from './crypto'
import { buildDemoHistory } from './demo-data'

type AnyState = Record<string, unknown>

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

function normalizeV1(state: TandemState): TandemState {
  return {
    version: '1.0',
    updatedAt: state.updatedAt || new Date().toISOString(),
    salt: state.salt || generateSalt(),
    settings: {
      currencySymbol: state.settings?.currencySymbol || '€',
      currencyLocale: state.settings?.currencyLocale || 'sk-SK',
      dateFormat: 'DD/MM/YYYY',
      emergencyTargetMonths: state.settings?.emergencyTargetMonths ?? 6,
      partnerAName: state.settings?.partnerAName || 'Partner A',
      partnerBName: state.settings?.partnerBName || 'Partner B',
      categories:
        state.settings?.categories?.length > 0
          ? state.settings.categories
          : DEFAULT_CATEGORIES,
      autoLockMinutes: state.settings?.autoLockMinutes ?? 30,
    },
    history: state.history || {},
  }
}

export function createInitialState(partial?: {
  partnerAName?: string
  partnerBName?: string
  currencySymbol?: string
  currencyLocale?: string
  salt?: string
  withDemoData?: boolean
}): TandemState {
  return {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    salt: partial?.salt || generateSalt(),
    settings: {
      currencySymbol: partial?.currencySymbol || '€',
      currencyLocale: partial?.currencyLocale || 'sk-SK',
      dateFormat: 'DD/MM/YYYY',
      emergencyTargetMonths: 6,
      partnerAName: partial?.partnerAName || 'Partner A',
      partnerBName: partial?.partnerBName || 'Partner B',
      categories: [...DEFAULT_CATEGORIES],
      autoLockMinutes: 30,
    },
    // Production vaults start empty; demo months only via Settings → loadDemoData
    // or explicit withDemoData: true (tests / intentional seed).
    history: partial?.withDemoData === true ? buildDemoHistory() : {},
  }
}
