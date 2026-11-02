import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastItem {
  id: string
  message: string
  tone: ToastTone
}

interface ToastStore {
  toasts: ToastItem[]
  show: (message: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}

const MAX_TOASTS = 3
const TTL_MS = 3600

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  show: (message, tone = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set({
      toasts: [...get().toasts, { id, message, tone }].slice(-MAX_TOASTS),
    })
    window.setTimeout(() => {
      get().dismiss(id)
    }, TTL_MS)
  },
  dismiss: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
}))

/** Fire-and-forget toast from store actions / non-React code. */
export function toast(message: string, tone: ToastTone = 'success') {
  useToastStore.getState().show(message, tone)
}

/** Map vault commit messages to short user-facing toast copy. */
export function toastMessageForPush(message: string): string | null {
  if (message.includes('save local edits before pull')) return null
  if (message.includes('update settings')) return 'Settings saved'
  if (message.startsWith('feat: track data')) return 'Month saved'
  if (message.includes('remove month')) return 'Month removed'
  if (message.includes('master password')) return 'Password updated'
  if (message.includes('import JSON')) return 'Backup imported'
  if (message.includes('load sample months')) return 'Sample months loaded'
  if (message.includes('remove sample months')) return 'Sample months removed'
  if (message.includes('force overwrite')) return 'Remote vault overwritten'
  return 'Vault saved'
}
