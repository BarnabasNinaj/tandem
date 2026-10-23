import type { GitHubConfig } from '@/types/tandem'

const PREFIX = 'tandem-device:'

interface InvitePayload {
  v: 1
  u: string
  r: string
  p: string
}

function toBase64Url(json: string): string {
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(raw: string): string {
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return decodeURIComponent(escape(atob(padded + pad)))
}

/** Compact invite string for QR / paste (contains PAT — treat as secret). */
export function encodeDeviceInvite(config: GitHubConfig): string {
  const payload: InvitePayload = {
    v: 1,
    u: config.username,
    r: config.repo,
    p: config.pat,
  }
  return `${PREFIX}${toBase64Url(JSON.stringify(payload))}`
}

export function decodeDeviceInvite(raw: string): GitHubConfig | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    let encoded = trimmed
    if (trimmed.startsWith(PREFIX)) {
      encoded = trimmed.slice(PREFIX.length)
    } else if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed) as InvitePayload
      if (parsed.v === 1 && parsed.u && parsed.r && parsed.p) {
        return { username: parsed.u, repo: parsed.r, pat: parsed.p }
      }
      return null
    }

    const parsed = JSON.parse(fromBase64Url(encoded)) as InvitePayload
    if (parsed.v !== 1 || !parsed.u || !parsed.r || !parsed.p) return null
    return { username: parsed.u, repo: parsed.r, pat: parsed.p }
  } catch {
    return null
  }
}
