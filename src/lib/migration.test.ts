import { describe, expect, it } from 'vitest'
import { createInitialState, migrateState } from './migration'

describe('migrateState', () => {
  it('normalizes a valid v1.0 vault', () => {
    const raw = createInitialState({
      withDemoData: false,
      partnerAName: 'Ada',
      partnerBName: 'Bea',
    })
    const migrated = migrateState(raw)
    expect(migrated.version).toBe('1.0')
    expect(migrated.settings.partnerAName).toBe('Ada')
    expect(migrated.settings.dateFormat).toBe('DD/MM/YYYY')
    expect(migrated.settings.categories.length).toBeGreaterThan(0)
    expect(migrated.history).toEqual({})
  })

  it('fills missing settings with defaults', () => {
    const migrated = migrateState({
      version: '1.0',
      updatedAt: '2026-01-01T00:00:00.000Z',
      salt: 'ab'.repeat(16),
      settings: {},
      history: {},
    })
    expect(migrated.settings.currencySymbol).toBe('€')
    expect(migrated.settings.currencyLocale).toBe('sk-SK')
    expect(migrated.settings.autoLockMinutes).toBe(30)
  })

  it('rejects unsupported versions and non-objects', () => {
    expect(() => migrateState({ version: '9.9' })).toThrow(/Unsupported vault/)
    expect(() => migrateState(null)).toThrow(/Invalid vault/)
    expect(() => migrateState('nope')).toThrow(/Invalid vault/)
  })
})

describe('createInitialState', () => {
  it('can start with empty history', () => {
    const state = createInitialState({ withDemoData: false })
    expect(Object.keys(state.history)).toHaveLength(0)
  })

  it('defaults to empty history (C3A)', () => {
    const state = createInitialState()
    expect(Object.keys(state.history)).toHaveLength(0)
  })

  it('includes demo history only when withDemoData is true', () => {
    const state = createInitialState({ withDemoData: true })
    expect(state.history['2026-09']).toBeDefined()
    expect(state.history['2026-10']).toBeDefined()
  })
})
