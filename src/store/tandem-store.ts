import { create } from 'zustand'
import {
  decryptEnvelope,
  encryptState,
  parseEnvelope,
  encryptJsonWithPassword,
  decryptJsonWithPassword,
} from '@/lib/crypto'
import {
  fetchRemoteVault,
  pushRemoteVault,
  GitHubConflictError,
} from '@/lib/github'
import { buildDemoHistory } from '@/lib/demo-data'
import { createInitialState, migrateState } from '@/lib/migration'
import {
  clearEncryptedDraft,
  clearSessionSecrets,
  getSessionPassword,
  loadEncryptedDraft,
  loadGitHubConfig,
  saveEncryptedDraft,
  saveGitHubConfig,
  setSessionPassword,
  setSessionUnlocked,
} from '@/lib/storage'
import { buildMonthlyRecord, type WizardDraft } from '@/lib/finance'
import type { GitHubConfig, MonthlyRecord, TandemState } from '@/types/tandem'

export type AppPhase =
  | 'booting'
  | 'setup'
  | 'locked'
  | 'unlocking'
  | 'ready'
  | 'error'

interface ConflictState {
  message: string
  remoteSha: string
  pendingContent: string
  pendingMessage: string
}

interface TandemStore {
  phase: AppPhase
  error: string | null
  state: TandemState | null
  github: GitHubConfig | null
  remoteSha: string | null
  syncing: boolean
  lastSyncedAt: string | null
  conflict: ConflictState | null
  wizardOpen: boolean
  wizardDraft: WizardDraft | null

  boot: () => Promise<void>
  completeSetup: (opts: {
    github: GitHubConfig
    password: string
    partnerAName: string
    partnerBName: string
    currencySymbol: string
    currencyLocale: string
  }) => Promise<void>
  unlock: (password: string) => Promise<void>
  lock: () => void
  pull: () => Promise<void>
  push: (message?: string) => Promise<void>
  resolveConflict: (action: 'pull' | 'overwrite') => Promise<void>
  updateState: (updater: (s: TandemState) => TandemState) => void
  saveMonth: (draft: WizardDraft) => Promise<void>
  openWizard: (draft?: WizardDraft) => void
  closeWizard: () => void
  setWizardDraft: (draft: WizardDraft) => void
  autosaveDraft: () => Promise<void>
  restoreDraft: () => Promise<WizardDraft | null>
  changePassword: (current: string, next: string) => Promise<void>
  exportJson: () => string
  importJson: (raw: string) => Promise<void>
  loadDemoData: () => Promise<void>
  updateGithub: (config: GitHubConfig) => void
}

export const useTandemStore = create<TandemStore>((set, get) => ({
  phase: 'booting',
  error: null,
  state: null,
  github: null,
  remoteSha: null,
  syncing: false,
  lastSyncedAt: null,
  conflict: null,
  wizardOpen: false,
  wizardDraft: null,

  boot: async () => {
    const github = loadGitHubConfig()
    if (!github?.username || !github?.repo || !github?.pat) {
      set({ phase: 'setup', github: null })
      return
    }
    set({ github, phase: 'locked' })
  },

  completeSetup: async ({
    github,
    password,
    partnerAName,
    partnerBName,
    currencySymbol,
    currencyLocale,
  }) => {
    saveGitHubConfig(github)
    const initial = createInitialState({
      partnerAName,
      partnerBName,
      currencySymbol,
      currencyLocale,
    })
    setSessionPassword(password)
    setSessionUnlocked(true)

    // Check if remote vault already exists
    set({ syncing: true, error: null, github })
    try {
      const remote = await fetchRemoteVault(github)
      if (remote) {
        const envelope = parseEnvelope(remote.content)
        const decrypted = migrateState(await decryptEnvelope(envelope, password))
        set({
          state: decrypted,
          remoteSha: remote.sha,
          phase: 'ready',
          syncing: false,
          lastSyncedAt: new Date().toISOString(),
        })
        return
      }

      const envelope = await encryptState(initial, password)
      const content = JSON.stringify(envelope)
      const sha = await pushRemoteVault(
        github,
        content,
        'chore: initialize Tandem vault',
        null,
      )
      set({
        state: initial,
        remoteSha: sha,
        phase: 'ready',
        syncing: false,
        lastSyncedAt: new Date().toISOString(),
      })
    } catch (e) {
      clearSessionSecrets()
      set({
        syncing: false,
        phase: 'setup',
        error: e instanceof Error ? e.message : 'Setup failed',
      })
      throw e
    }
  },

  unlock: async (password: string) => {
    const { github } = get()
    if (!github) {
      set({ phase: 'setup' })
      return
    }
    set({ phase: 'unlocking', error: null })
    try {
      const remote = await fetchRemoteVault(github)
      if (!remote) {
        // First unlock after setup without remote — create empty
        const initial = createInitialState()
        const envelope = await encryptState(initial, password)
        const sha = await pushRemoteVault(
          github,
          JSON.stringify(envelope),
          'chore: initialize Tandem vault',
          null,
        )
        setSessionPassword(password)
        setSessionUnlocked(true)
        set({
          state: initial,
          remoteSha: sha,
          phase: 'ready',
          lastSyncedAt: new Date().toISOString(),
        })
        return
      }
      const envelope = parseEnvelope(remote.content)
      const decrypted = migrateState(await decryptEnvelope(envelope, password))
      setSessionPassword(password)
      setSessionUnlocked(true)
      set({
        state: decrypted,
        remoteSha: remote.sha,
        phase: 'ready',
        lastSyncedAt: new Date().toISOString(),
      })
    } catch (e) {
      clearSessionSecrets()
      set({
        phase: 'locked',
        error: e instanceof Error ? e.message : 'Unlock failed',
      })
    }
  },

  lock: () => {
    clearSessionSecrets()
    clearEncryptedDraft()
    set({
      state: null,
      phase: 'locked',
      wizardOpen: false,
      wizardDraft: null,
      conflict: null,
      error: null,
    })
  },

  pull: async () => {
    const { github } = get()
    const password = getSessionPassword()
    if (!github || !password) return
    set({ syncing: true, error: null })
    try {
      const remote = await fetchRemoteVault(github)
      if (!remote) throw new Error('No remote vault found.')
      const decrypted = migrateState(
        await decryptEnvelope(parseEnvelope(remote.content), password),
      )
      set({
        state: decrypted,
        remoteSha: remote.sha,
        syncing: false,
        lastSyncedAt: new Date().toISOString(),
        conflict: null,
      })
    } catch (e) {
      set({
        syncing: false,
        error: e instanceof Error ? e.message : 'Pull failed',
      })
    }
  },

  push: async (message = 'chore: update Tandem vault') => {
    const { github, state, remoteSha } = get()
    const password = getSessionPassword()
    if (!github || !state || !password) return
    set({ syncing: true, error: null })
    try {
      const next = { ...state, updatedAt: new Date().toISOString() }
      const envelope = await encryptState(next, password)
      const content = JSON.stringify(envelope)
      try {
        const sha = await pushRemoteVault(github, content, message, remoteSha)
        set({
          state: next,
          remoteSha: sha,
          syncing: false,
          lastSyncedAt: new Date().toISOString(),
          conflict: null,
        })
      } catch (e) {
        if (e instanceof GitHubConflictError) {
          set({
            syncing: false,
            conflict: {
              message: e.message,
              remoteSha: e.remoteSha,
              pendingContent: content,
              pendingMessage: message,
            },
          })
          return
        }
        throw e
      }
    } catch (e) {
      set({
        syncing: false,
        error: e instanceof Error ? e.message : 'Push failed',
      })
    }
  },

  resolveConflict: async (action) => {
    const { conflict, github } = get()
    const password = getSessionPassword()
    if (!conflict || !github || !password) return
    if (action === 'pull') {
      await get().pull()
      return
    }
    set({ syncing: true })
    try {
      const sha = await pushRemoteVault(
        github,
        conflict.pendingContent,
        conflict.pendingMessage + ' (force overwrite)',
        conflict.remoteSha || null,
      )
      const decrypted = migrateState(
        await decryptEnvelope(
          parseEnvelope(conflict.pendingContent),
          password,
        ),
      )
      set({
        state: decrypted,
        remoteSha: sha,
        syncing: false,
        conflict: null,
        lastSyncedAt: new Date().toISOString(),
      })
    } catch (e) {
      set({
        syncing: false,
        error: e instanceof Error ? e.message : 'Overwrite failed',
      })
    }
  },

  updateState: (updater) => {
    const { state } = get()
    if (!state) return
    set({ state: updater(state) })
  },

  saveMonth: async (draft) => {
    const record = buildMonthlyRecord(draft)
    get().updateState((s) => ({
      ...s,
      updatedAt: new Date().toISOString(),
      history: { ...s.history, [record.monthKey]: record },
    }))
    clearEncryptedDraft()
    set({ wizardOpen: false, wizardDraft: null })
    await get().push(`feat: close month ${record.monthKey}`)
  },

  openWizard: (draft) => {
    set({ wizardOpen: true, wizardDraft: draft ?? null })
  },

  closeWizard: () => {
    set({ wizardOpen: false })
  },

  setWizardDraft: (draft) => {
    set({ wizardDraft: draft })
  },

  autosaveDraft: async () => {
    const { wizardDraft, state } = get()
    const password = getSessionPassword()
    if (!wizardDraft || !password || !state) return
    const enc = await encryptJsonWithPassword(
      wizardDraft,
      password,
      state.salt,
    )
    saveEncryptedDraft(enc)
  },

  restoreDraft: async () => {
    const password = getSessionPassword()
    const raw = loadEncryptedDraft()
    if (!password || !raw) return null
    try {
      return await decryptJsonWithPassword<WizardDraft>(raw, password)
    } catch {
      return null
    }
  },

  changePassword: async (current, next) => {
    const { state, github, remoteSha } = get()
    if (!state || !github) throw new Error('Not unlocked')
    // Verify current by re-encrypt attempt after decrypt check
    const password = getSessionPassword()
    if (password !== current) throw new Error('Current password is incorrect.')
    const nextState = { ...state, updatedAt: new Date().toISOString() }
    const envelope = await encryptState(nextState, next)
    const content = JSON.stringify(envelope)
    const sha = await pushRemoteVault(
      github,
      content,
      'security: rotate master password',
      remoteSha,
    )
    setSessionPassword(next)
    set({
      state: nextState,
      remoteSha: sha,
      lastSyncedAt: new Date().toISOString(),
    })
  },

  exportJson: () => {
    const { state } = get()
    if (!state) return '{}'
    return JSON.stringify(state, null, 2)
  },

  importJson: async (raw: string) => {
    const parsed = migrateState(JSON.parse(raw))
    set({ state: parsed })
    await get().push('chore: import JSON backup')
  },

  loadDemoData: async () => {
    const demo = buildDemoHistory()
    get().updateState((s) => ({
      ...s,
      updatedAt: new Date().toISOString(),
      history: { ...s.history, ...demo },
    }))
    await get().push('chore: load sample months (2026-09, 2026-10)')
  },

  updateGithub: (config) => {
    saveGitHubConfig(config)
    set({ github: config })
  },
}))

export type { MonthlyRecord }
