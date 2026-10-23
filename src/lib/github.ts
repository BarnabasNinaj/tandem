import { DATA_FILENAME, type GitHubConfig } from '@/types/tandem'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 400

export class GitHubConflictError extends Error {
  remoteSha: string
  constructor(message: string, remoteSha: string) {
    super(message)
    this.name = 'GitHubConflictError'
    this.remoteSha = remoteSha
  }
}

export class GitHubNotFoundError extends Error {
  constructor(message = 'Vault file not found on GitHub.') {
    super(message)
    this.name = 'GitHubNotFoundError'
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (err instanceof GitHubConflictError) throw err
      if (err instanceof GitHubNotFoundError) throw err
      if (attempt < MAX_RETRIES - 1) {
        await sleep(BASE_DELAY_MS * 2 ** attempt)
      }
    }
  }
  throw lastError
}

function contentsUrl(config: GitHubConfig, path = DATA_FILENAME): string {
  return `https://api.github.com/repos/${config.username}/${config.repo}/contents/${path}`
}

function headers(pat: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${pat}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export interface RemoteVault {
  content: string
  sha: string
}

export async function fetchRemoteVault(
  config: GitHubConfig,
): Promise<RemoteVault | null> {
  return withRetry(async () => {
    const res = await fetch(contentsUrl(config), {
      headers: headers(config.pat),
    })
    if (res.status === 404) return null
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`GitHub fetch failed (${res.status}): ${body}`)
    }
    const data = (await res.json()) as {
      content: string
      encoding: string
      sha: string
    }
    const decoded = atob(data.content.replace(/\n/g, ''))
    return { content: decoded, sha: data.sha }
  })
}

export async function pushRemoteVault(
  config: GitHubConfig,
  content: string,
  message: string,
  knownSha?: string | null,
): Promise<string> {
  return withRetry(async () => {
    // Optimistic lock: re-check SHA if we have one
    if (knownSha) {
      const current = await fetchRemoteVault(config)
      if (current && current.sha !== knownSha) {
        throw new GitHubConflictError(
          'Remote data is newer. Pull remote updates or force overwrite?',
          current.sha,
        )
      }
    }

    const body: Record<string, string> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: config.branch || 'main',
    }
    if (knownSha) body.sha = knownSha

    // If no knownSha, try create; if file exists, need sha
    if (!knownSha) {
      const existing = await fetchRemoteVault(config)
      if (existing) body.sha = existing.sha
    }

    const res = await fetch(contentsUrl(config), {
      method: 'PUT',
      headers: {
        ...headers(config.pat),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (res.status === 409 || res.status === 422) {
      const remote = await fetchRemoteVault(config)
      throw new GitHubConflictError(
        'Remote data is newer. Pull remote updates or force overwrite?',
        remote?.sha ?? '',
      )
    }

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GitHub push failed (${res.status}): ${text}`)
    }

    const data = (await res.json()) as { content: { sha: string } }
    return data.content.sha
  })
}

export async function testGitHubConnection(
  config: GitHubConfig,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${config.username}/${config.repo}`,
      { headers: headers(config.pat) },
    )
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Invalid PAT or insufficient permissions.' }
    }
    if (res.status === 404) {
      return { ok: false, message: 'Repository not found. Check username/repo.' }
    }
    if (!res.ok) {
      return { ok: false, message: `GitHub error: ${res.status}` }
    }
    return { ok: true, message: 'Connected successfully.' }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Network error',
    }
  }
}
