import type { TandemState } from '@/types/tandem'

/** Month-key / timestamp snapshot for ConflictDialog (no deep month merge). */
export interface ConflictSummary {
  localUpdatedAt: string
  remoteUpdatedAt: string
  /** Tracked months only in the pending local vault. */
  localOnlyMonths: string[]
  /** Tracked months only on GitHub. */
  remoteOnlyMonths: string[]
  /** Months present on both sides (amounts may still differ). */
  sharedMonths: string[]
}

export function summarizeVaultConflict(
  local: TandemState,
  remote: TandemState,
): ConflictSummary {
  const localKeys = Object.keys(local.history).sort()
  const remoteKeys = Object.keys(remote.history).sort()
  const remoteSet = new Set(remoteKeys)
  const localSet = new Set(localKeys)
  return {
    localUpdatedAt: local.updatedAt,
    remoteUpdatedAt: remote.updatedAt,
    localOnlyMonths: localKeys.filter((k) => !remoteSet.has(k)),
    remoteOnlyMonths: remoteKeys.filter((k) => !localSet.has(k)),
    sharedMonths: localKeys.filter((k) => remoteSet.has(k)),
  }
}
