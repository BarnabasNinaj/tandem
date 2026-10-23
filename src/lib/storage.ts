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

/** Session-only unlock marker (never stores password in localStorage). */
export function setSessionUnlocked(flag: boolean): void {
  if (flag) sessionStorage.setItem(SESSION_FLAG, '1')
  else sessionStorage.removeItem(SESSION_FLAG)
}

export function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_FLAG) === '1'
}

/** Password kept ONLY in sessionStorage — purged on lock / tab close. */
const PW_KEY = 'tandem.sk'
/** Encrypted vault snapshot for same-tab refresh without re-login. */
const VAULT_CACHE_KEY = 'tandem.vault.cache'

export function setSessionPassword(password: string): void {
  sessionStorage.setItem(PW_KEY, password)
}

export function getSessionPassword(): string | null {
  return sessionStorage.getItem(PW_KEY)
}

export function saveSessionVaultCache(content: string, sha: string): void {
  sessionStorage.setItem(VAULT_CACHE_KEY, JSON.stringify({ content, sha }))
}

export function loadSessionVaultCache(): { content: string; sha: string } | null {
  try {
    const raw = sessionStorage.getItem(VAULT_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { content?: string; sha?: string }
    if (!parsed.content || !parsed.sha) return null
    return { content: parsed.content, sha: parsed.sha }
  } catch {
    return null
  }
}

export function clearSessionSecrets(): void {
  sessionStorage.removeItem(PW_KEY)
  sessionStorage.removeItem(SESSION_FLAG)
  sessionStorage.removeItem(VAULT_CACHE_KEY)
}
