/**
 * Bridge so Save (button or Ctrl/Cmd+S) can merge pending CardExpenses
 * sheet amounts into the open draft before persisting.
 */
let flushFn: (() => boolean) | null = null

export function registerCardSheetFlush(fn: (() => boolean) | null) {
  flushFn = fn
}

/** @returns true if any sheet amounts were merged into the draft */
export function flushCardSheetPending(): boolean {
  return flushFn?.() ?? false
}
