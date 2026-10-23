import type { GitHubConfig } from '@/types/tandem'

const GH_KEY = 'tandem.github'
const THEME_KEY = 'tandem.theme'
const DRAFT_KEY = 'tandem.draft.enc'
const SESSION_FLAG = 'tandem.unlocked'

export function loadGitHubConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(GH_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GitHubConfig
  } catch {
    return null
  }
}

export function saveGitHubConfig(config: GitHubConfig): void {
  localStorage.setItem(GH_KEY, JSON.stringify(config))
}

export function clearGitHubConfig(): void {
  localStorage.removeItem(GH_KEY)
}

export function loadTheme(): 'light' | 'dark' {
  const t = localStorage.getItem(THEME_KEY)
  return t === 'dark' ? 'dark' : 'light'
}

export function saveTheme(theme: 'light' | 'dark'): void {
  localStorage.setItem(THEME_KEY, theme)
}

export function saveEncryptedDraft(ciphertext: string): void {
  localStorage.setItem(DRAFT_KEY, ciphertext)
}

export function loadEncryptedDraft(): string | null {
  return localStorage.getItem(DRAFT_KEY)
}

export function clearEncryptedDraft(): void {
  localStorage.removeItem(DRAFT_KEY)
}

/** Session-only unlock marker (never stores password). */
export function setSessionUnlocked(flag: boolean): void {
  if (flag) sessionStorage.setItem(SESSION_FLAG, '1')
  else sessionStorage.removeItem(SESSION_FLAG)
}

export function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_FLAG) === '1'
}

/** Password kept ONLY in sessionStorage under a non-obvious key — purged on lock. */
const PW_KEY = 'tandem.sk'

export function setSessionPassword(password: string): void {
  sessionStorage.setItem(PW_KEY, password)
}

export function getSessionPassword(): string | null {
  return sessionStorage.getItem(PW_KEY)
}

export function clearSessionSecrets(): void {
  sessionStorage.removeItem(PW_KEY)
  sessionStorage.removeItem(SESSION_FLAG)
}
