import { Button } from '@/components/ui/button'
import { useTandemStore } from '@/store/tandem-store'

export function ConflictDialog() {
  const conflict = useTandemStore((s) => s.conflict)
  const resolveConflict = useTandemStore((s) => s.resolveConflict)
  const syncing = useTandemStore((s) => s.syncing)

  if (!conflict) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900"
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
