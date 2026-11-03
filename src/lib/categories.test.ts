import { describe, expect, it } from 'vitest'
import { ensureDefaultCategories } from './categories'

describe('ensureDefaultCategories', () => {
  it('appends missing stock defaults including Investments', () => {
    const next = ensureDefaultCategories([
      { id: 'housing', name: 'Housing', isDefault: true },
    ])
    expect(next.some((c) => c.id === 'investments')).toBe(true)
    expect(next[0]?.id).toBe('housing')
  })
})
