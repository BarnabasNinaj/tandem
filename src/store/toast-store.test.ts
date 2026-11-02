import { describe, expect, it } from 'vitest'
import { toastMessageForPush } from './toast-store'

describe('toastMessageForPush', () => {
  it('maps known commit messages and silences pre-pull saves', () => {
    expect(
      toastMessageForPush('chore: save local edits before pull'),
    ).toBeNull()
    expect(toastMessageForPush('chore: update settings')).toBe('Settings saved')
    expect(toastMessageForPush('feat: track data 2026-03')).toBe('Month saved')
    expect(toastMessageForPush('chore: remove month 2026-03')).toBe(
      'Month removed',
    )
    expect(toastMessageForPush('security: rotate master password')).toBe(
      'Password updated',
    )
    expect(toastMessageForPush('chore: update Tandem vault')).toBe(
      'Vault saved',
    )
  })
})
