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
    expect(
      migrated.settings.categories.some((c) => c.id === 'investments'),
    ).toBe(true)
    expect(migrated.history).toEqual({})
  })

  it('appends missing default categories and refreshes outflow names', () => {
    const migrated = migrateState({
      version: '1.0',
      updatedAt: '2026-01-01T00:00:00.000Z',
      salt: 'ab'.repeat(16),
      settings: {
        categories: [
          { id: 'housing', name: 'Housing', isDefault: true },
          { id: 'dining', name: 'Restaurants', isDefault: true },
        ],
      },
      history: {
        '2026-01': {
          monthKey: '2026-01',
          updatedAt: '2026-01-31T00:00:00.000Z',
          inflows: {
            partnerASalary: 2000,
            partnerBIncome: 1000,
            otherInflows: 0,
          },
          outflows: [
            {
              categoryId: 'dining',
              categoryName: 'Dining/Leisure',
              amount: 80,
            },
          ],
          computed: {
            totalInflow: 3000,
            totalOutflow: 80,
            leftoverAfterExpenses: 2920,
            discretionarySurplus: 2920,
            expenseSharePartnerA: 40,
            expenseSharePartnerB: 40,
            personalAllowancePartnerA: 1460,
            personalAllowancePartnerB: 1460,
            allowanceSplit: 'equal',
          },
        },
      },
    })
    expect(
      migrated.settings.categories.some((c) => c.id === 'investments'),
    ).toBe(true)
    const dining = migrated.history['2026-01']!.outflows.find(
      (o) => o.categoryId === 'dining',
    )
    expect(dining?.categoryName).toBe('Restaurants')
    expect(dining?.amount).toBe(80)
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
    expect(migrated.settings).not.toHaveProperty('emergencyTargetMonths')
    expect(migrated.settings.autoLockMinutes).toBe(30)
    expect(migrated.settings.partnerAName).toBe('Barney')
    expect(migrated.settings.partnerBName).toBe('Lucka')
    expect(migrated.settings.allowanceSplit).toBe('equal')
  })

  it('folds legacy childSupport into otherInflows', () => {
    const migrated = migrateState({
      version: '1.0',
      updatedAt: '2026-01-01T00:00:00.000Z',
      salt: 'ab'.repeat(16),
      settings: { partnerAName: 'Partner A', partnerBName: 'Partner B' },
      history: {
        '2026-01': {
          monthKey: '2026-01',
          updatedAt: '2026-01-31T00:00:00.000Z',
          inflows: {
            partnerASalary: 1000,
            partnerBIncome: 500,
            childSupport: 200,
            otherInflows: 50,
          },
          outflows: [],
          allocations: {
            emergencyReserve: 100,
            travelFund: 0,
            investments: 0,
          },
          portfolioSnapshot: {
            emergencyReserveBalance: 500,
            travelFundBalance: 0,
            externalInvestmentsBalance: 0,
            liquidCashBalance: 0,
          },
          computed: {
            totalInflow: 0,
            totalOutflow: 0,
            discretionarySurplus: 0,
            personalAllowancePerPartner: 0,
          },
        },
      },
    })
    expect(migrated.settings.partnerAName).toBe('Barney')
    expect(migrated.settings.partnerBName).toBe('Lucka')
    const jan = migrated.history['2026-01']!
    expect(jan.inflows).toEqual({
      partnerASalary: 1000,
      partnerBIncome: 500,
      otherInflows: 250,
    })
    expect(jan.computed.totalInflow).toBe(1750)
    expect(jan.computed.leftoverAfterExpenses).toBe(1750)
    expect(jan.computed.expenseSharePartnerA).toBe(0)
    expect(jan.computed).not.toHaveProperty('personalAllowancePerPartner')
    expect(jan).not.toHaveProperty('allocations')
    expect(jan).not.toHaveProperty('portfolioSnapshot')
    expect(
      'childSupport' in (jan.inflows as Record<string, unknown>),
    ).toBe(false)
  })

  it('rejects unsupported versions and non-objects', () => {
    expect(() => migrateState({ version: '9.9' })).toThrow(/Unsupported vault/)
    expect(() => migrateState(null)).toThrow(/Invalid vault/)
    expect(() => migrateState('nope')).toThrow(/Invalid vault/)
  })

  it('migrates legacy cards / mappings into a bank', () => {
    const migrated = migrateState({
      version: '1.0',
      updatedAt: '2026-01-01T00:00:00.000Z',
      salt: 'ab'.repeat(16),
      settings: {
        cards: [
          { id: 'c1', name: 'Visa', owner: 'partnerA' },
          { id: 'c2', name: 'Joint', owner: 'common' },
        ],
        categoryMappings: [
          { key: 'fuel', label: 'Fuel', categoryId: 'transport' },
        ],
      },
      history: {},
    })
    expect(migrated.settings.banks).toEqual([
      { id: 'bank-migrated', name: 'Bank' },
    ])
    expect(migrated.settings.cards.every((c) => c.bankId === 'bank-migrated')).toBe(
      true,
    )
    expect(migrated.settings.categoryMappings).toEqual([
      {
        bankId: 'bank-migrated',
        key: 'fuel',
        label: 'Fuel',
        categoryId: 'transport',
      },
    ])
  })
})

describe('createInitialState', () => {
  it('can start with empty history', () => {
    const state = createInitialState({ withDemoData: false })
    expect(Object.keys(state.history)).toHaveLength(0)
    expect(state.settings.banks).toEqual([])
    expect(state.settings.cards).toEqual([])
    expect(state.settings.categoryMappings).toEqual([])
  })

  it('defaults to empty history (C3A)', () => {
    const state = createInitialState()
    expect(Object.keys(state.history)).toHaveLength(0)
  })

  it('includes demo history only when withDemoData is true', () => {
    const state = createInitialState({ withDemoData: true })
    expect(Object.keys(state.history).sort()).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
    ])
  })
})
