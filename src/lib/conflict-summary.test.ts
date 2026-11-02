import { describe, expect, it } from 'vitest'
import { summarizeVaultConflict } from './conflict-summary'
import type { TandemState } from '@/types/tandem'

function stubState(
  months: string[],
  updatedAt: string,
): TandemState {
  return {
    version: '1.0',
    updatedAt,
    settings: {} as TandemState['settings'],
    history: Object.fromEntries(
      months.map((monthKey) => [
        monthKey,
        { monthKey } as TandemState['history'][string],
      ]),
    ),
  }
}

describe('summarizeVaultConflict', () => {
  it('diffs month keys and keeps timestamps', () => {
    const local = stubState(['2026-01', '2026-02', '2026-03'], '2026-03-01T10:00:00.000Z')
    const remote = stubState(['2026-02', '2026-03', '2026-04'], '2026-03-01T12:00:00.000Z')
    expect(summarizeVaultConflict(local, remote)).toEqual({
      localUpdatedAt: '2026-03-01T10:00:00.000Z',
      remoteUpdatedAt: '2026-03-01T12:00:00.000Z',
      localOnlyMonths: ['2026-01'],
      remoteOnlyMonths: ['2026-04'],
      sharedMonths: ['2026-02', '2026-03'],
    })
  })
})
