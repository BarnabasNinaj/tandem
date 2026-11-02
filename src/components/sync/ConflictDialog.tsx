import { Button } from '@/components/ui/button'
import {
  formatDateTimeDDMMYYYY,
  formatMonthKey,
} from '@/lib/dates'
import { useTandemStore } from '@/store/tandem-store'

function monthList(keys: string[]): string {
  if (keys.length === 0) return 'none'
  const shown = keys.slice(0, 8).map(formatMonthKey)
  const extra = keys.length - shown.length
  return extra > 0 ? `${shown.join(', ')} (+${extra})` : shown.join(', ')
}

export function ConflictDialog() {
  const conflict = useTandemStore((s) => s.conflict)
  const resolveConflict = useTandemStore((s) => s.resolveConflict)
  const syncing = useTandemStore((s) => s.syncing)

  if (!conflict) return null

  const summary = conflict.summary

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        role="alertdialog"
        aria-labelledby="conflict-title"
      >
        <h2
          id="conflict-title"
          className="text-lg font-semibold text-stone-900 dark:text-stone-50"
        >
          Sync conflict
        </h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          {conflict.message}
        </p>
        {summary ? (
          <div className="mt-3 space-y-2 rounded-lg bg-stone-100 px-3 py-2.5 text-xs text-stone-700 dark:bg-stone-800/60 dark:text-stone-300">
            <p>
              <span className="font-medium text-stone-900 dark:text-stone-100">
                This device
              </span>{' '}
              updated {formatDateTimeDDMMYYYY(summary.localUpdatedAt)}
            </p>
            <p>
              <span className="font-medium text-stone-900 dark:text-stone-100">
                GitHub
              </span>{' '}
              updated {formatDateTimeDDMMYYYY(summary.remoteUpdatedAt)}
            </p>
            {summary.localOnlyMonths.length > 0 ? (
              <p>
                Only here:{' '}
                <span className="text-stone-800 dark:text-stone-200">
                  {monthList(summary.localOnlyMonths)}
                </span>
              </p>
            ) : null}
            {summary.remoteOnlyMonths.length > 0 ? (
              <p>
                Only on GitHub:{' '}
                <span className="text-stone-800 dark:text-stone-200">
                  {monthList(summary.remoteOnlyMonths)}
                </span>
              </p>
            ) : null}
            {summary.localOnlyMonths.length === 0 &&
            summary.remoteOnlyMonths.length === 0 ? (
              <p>
                Same months on both ({summary.sharedMonths.length}) — contents
                may still differ.
              </p>
            ) : null}
          </div>
        ) : null}
        <ul className="mt-3 space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
          <li>
            <span className="font-medium text-stone-800 dark:text-stone-200">
              Pull remote updates
            </span>{' '}
            — discard this device’s pending save and load what’s on GitHub.
          </li>
          <li>
            <span className="font-medium text-stone-800 dark:text-stone-200">
              Force overwrite
            </span>{' '}
            — replace the remote vault with this device’s version. Partner edits
            already on GitHub may be lost.
          </li>
        </ul>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            disabled={syncing}
            onClick={() => void resolveConflict('pull')}
          >
            Pull remote updates
          </Button>
          <Button
            variant="danger"
            disabled={syncing}
            onClick={() => void resolveConflict('overwrite')}
          >
            Force overwrite
          </Button>
        </div>
      </div>
    </div>
  )
}
