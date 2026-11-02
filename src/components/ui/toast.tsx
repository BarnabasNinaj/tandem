import { Check, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore, type ToastTone } from '@/store/toast-store'

function toneIcon(tone: ToastTone) {
  if (tone === 'error') return X
  if (tone === 'info') return Info
  return Check
}

function toneClasses(tone: ToastTone) {
  if (tone === 'error') {
    return 'border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/90 dark:text-red-100'
  }
  if (tone === 'info') {
    return 'border-stone-300 bg-white text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50'
  }
  return 'border-teal-800/25 bg-teal-50 text-teal-950 dark:border-teal-400/30 dark:bg-teal-950/80 dark:text-teal-50'
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = toneIcon(t.tone)
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm shadow-lg sm:w-80',
              toneClasses(t.tone),
            )}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
            <button
              type="button"
              className="cursor-pointer rounded-md p-0.5 opacity-60 hover:opacity-100"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
