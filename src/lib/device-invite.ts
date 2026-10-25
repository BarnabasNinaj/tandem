import type { GitHubConfig } from '@/types/tandem'

/**
 * v2 invite: HTTPS app link with encrypted blob in the **hash** fragment only.
 * Phone cameras open the site; username/repo/PAT are NOT in the clear.
 * Decrypt requires a pairing code shown next to the QR (not in the QR).
 *
 * Legacy cleartext `TANDEM1.` / `tandem-device:` still decode for old pastes —
 * new QR codes never emit those.
 */
const V2_PREFIX = 'TANDEM2.'
const LEGACY_PREFIXES = ['TANDEM1.', 'tandem-device:'] as const
const HASH_PARAM = 'i'
/** Higher than vault default — pairing codes are short; raise offline cost. */
const PBKDF2_ITERATIONS = 300_000
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford-ish (no I,L,O,U)
/** ~50 bits (32^10). Still speakable; stronger than 8-char (~40 bit) codes. */
const CODE_LENGTH = 10

interface ClearPayload {
  v: 1
  u: string
  r: string
  p: string
}

interface EncryptedInviteBlob {
  v: 2
  s: string // salt hex
  iv: string // base64
  c: string // ciphertext base64
  /** PBKDF2 iterations; omit on early v2 blobs ⇒ 100_000 */
  i?: number
}

const LEGACY_INVITE_ITERATIONS = 100_000

export interface CreatedDeviceInvite {
  /** Full URL for QR / camera open (secrets only in encrypted hash). */
  url: string
  /** Shown on-screen only — required to unlock the invite. */
  code: string
  /** Encrypted blob (`TANDEM2.…`) for paste without the full URL. */
  blob: string
}

function toBase64Url(binaryB64: string): string {
  return binaryB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(raw: string): string {
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return padded + pad
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(fromBase64Url(b64))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function hexFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function bytesFromHex(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g)
  if (!matches) return new Uint8Array()
  return new Uint8Array(matches.map((b) => Number.parseInt(b, 16)))
}

function parseClearPayload(parsed: ClearPayload): GitHubConfig | null {
  if (parsed.v !== 1 || !parsed.u || !parsed.r || !parsed.p) return null
  return { username: parsed.u, repo: parsed.r, pat: parsed.p }
}

export function generatePairingCode(): string {
  // Rejection sampling — alphabet length divides 256, but keep the pattern explicit.
  const out: string[] = []
  while (out.length < CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    for (const b of bytes) {
      if (out.length >= CODE_LENGTH) break
      if (b! >= 256 - (256 % CODE_ALPHABET.length)) continue
      out.push(CODE_ALPHABET[b! % CODE_ALPHABET.length]!)
    }
  }
  return out.join('')
}

/** Display helper: ABCD-EFGH-IJ */
export function formatPairingCode(code: string): string {
  const bare = code.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
  return bare.match(/.{1,4}/g)?.join('-') ?? bare
}

export function normalizePairingCode(code: string): string {
  return code.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
}

async function deriveInviteKey(
  code: string,
  saltHex: string,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(normalizePairingCode(code)),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: bytesFromHex(saltHex) as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptPayload(
  config: GitHubConfig,
  code: string,
): Promise<EncryptedInviteBlob> {
  const salt = hexFromBytes(crypto.getRandomValues(new Uint8Array(16)))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveInviteKey(code, salt, PBKDF2_ITERATIONS)
  const clear: ClearPayload = {
    v: 1,
    u: config.username,
    r: config.repo,
    p: config.pat,
  }
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(clear)),
  )
  return {
    v: 2,
    s: salt,
    iv: bytesToBase64(iv),
    c: bytesToBase64(new Uint8Array(ciphertext)),
    i: PBKDF2_ITERATIONS,
  }
}

/** Attacker-controlled `i` must not downgrade work factor — whitelist only. */
function resolveInviteIterations(blob: EncryptedInviteBlob): number {
  if (blob.i === undefined || blob.i === null) return LEGACY_INVITE_ITERATIONS
  if (blob.i === PBKDF2_ITERATIONS || blob.i === LEGACY_INVITE_ITERATIONS) {
    return blob.i
  }
  // Unknown / tampered → use the stronger current policy (fail closed on cost).
  return PBKDF2_ITERATIONS
}

async function decryptBlob(
  blob: EncryptedInviteBlob,
  code: string,
): Promise<GitHubConfig | null> {
  try {
    const key = await deriveInviteKey(code, blob.s, resolveInviteIterations(blob))
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(blob.iv) as BufferSource },
      key,
      base64ToBytes(blob.c) as BufferSource,
    )
    return parseClearPayload(
      JSON.parse(new TextDecoder().decode(plain)) as ClearPayload,
    )
  } catch {
    return null
  }
}

function encodeV2Blob(envelope: EncryptedInviteBlob): string {
  return `${V2_PREFIX}${toBase64Url(bytesToBase64(new TextEncoder().encode(JSON.stringify(envelope))))}`
}

function decodeV2Blob(raw: string): EncryptedInviteBlob | null {
  try {
    let body = raw.trim()
    if (body.startsWith(V2_PREFIX)) body = body.slice(V2_PREFIX.length)
    const json = new TextDecoder().decode(base64ToBytes(body))
    const parsed = JSON.parse(json) as EncryptedInviteBlob
    if (parsed.v !== 2 || !parsed.s || !parsed.iv || !parsed.c) return null
    return parsed
  } catch {
    return null
  }
}

function materialFromHashString(hash: string): string | null {
  const cleaned = hash.replace(/^#/, '')
  if (!cleaned) return null
  const params = new URLSearchParams(
    cleaned.includes('=') ? cleaned : `${HASH_PARAM}=${cleaned}`,
  )
  return params.get(HASH_PARAM) ?? params.get('invite')
}

/**
 * Pull invite material from a pasted URL, hash, or raw blob.
 * Hash fragment only for URLs — query `?i=` is rejected (would hit server logs / Referer).
 */
export function extractInviteMaterial(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed)
      if (url.searchParams.has(HASH_PARAM) || url.searchParams.has('invite')) {
        // Do not accept query transport — fragment-only by design.
        return null
      }
      return materialFromHashString(url.hash)
    }
  } catch {
    /* not a URL */
  }

  if (trimmed.startsWith('#')) {
    return materialFromHashString(trimmed)
  }

  if (
    trimmed.startsWith(V2_PREFIX) ||
    LEGACY_PREFIXES.some((p) => trimmed.startsWith(p)) ||
    trimmed.startsWith('{')
  ) {
    return trimmed
  }

  // Bare v2 body (base64url) — rare
  if (/^[A-Za-z0-9_-]+$/.test(trimmed) && trimmed.length > 40) return trimmed

  return null
}

const PENDING_INVITE_KEY = 'tandem.invite.pending'

function stripInviteFromAddressBar(): void {
  const url = new URL(window.location.href)
  let dirty = false
  if (url.hash) {
    url.hash = ''
    dirty = true
  }
  // Defense: drop accidental query invite params if someone hand-crafted a link.
  if (url.searchParams.has(HASH_PARAM) || url.searchParams.has('invite')) {
    url.searchParams.delete(HASH_PARAM)
    url.searchParams.delete('invite')
    dirty = true
  }
  if (dirty) {
    const next = `${url.pathname}${url.search}`
    window.history.replaceState(null, '', next || '/')
  }
}

/**
 * Read `#i=…` from the page, stash in sessionStorage, strip hash (and stray `?i=`)
 * from the address bar. Safe to call on every boot — not only during setup.
 */
export function consumeInviteHashFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.replace(/^#/, '')
  if (hash) {
    const material = materialFromHashString(hash)
    if (material) {
      try {
        sessionStorage.setItem(PENDING_INVITE_KEY, material)
      } catch {
        /* private mode quota */
      }
    }
  }
  stripInviteFromAddressBar()
  try {
    return sessionStorage.getItem(PENDING_INVITE_KEY)
  } catch {
    return null
  }
}

/** Drop stashed invite after successful unlock, cancel, or unused on lock/ready. */
export function clearPendingInviteHash(): void {
  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY)
  } catch {
    /* ignore */
  }
}

export function peekPendingInviteHash(): string | null {
  try {
    return sessionStorage.getItem(PENDING_INVITE_KEY)
  } catch {
    return null
  }
}

export function isEncryptedInvite(material: string): boolean {
  const m = material.trim()
  return m.startsWith(V2_PREFIX) || Boolean(decodeV2Blob(m))
}

export function isLegacyCleartextInvite(material: string): boolean {
  const m = material.trim()
  return (
    LEGACY_PREFIXES.some((p) => m.startsWith(p)) ||
    (m.startsWith('{') && m.includes('"p"'))
  )
}

/** Build camera-openable invite URL + on-screen pairing code. */
export async function createDeviceInvite(
  config: GitHubConfig,
  origin: string = typeof window !== 'undefined' ? window.location.origin : '',
): Promise<CreatedDeviceInvite> {
  const code = generatePairingCode()
  const envelope = await encryptPayload(config, code)
  const blob = encodeV2Blob(envelope)
  const base = origin.replace(/\/$/, '') || ''
  const url = `${base}/#${HASH_PARAM}=${blob}`
  return { url, code, blob }
}

/**
 * Unlock invite material (URL, hash blob, or legacy cleartext).
 * Encrypted v2 requires `code`. Legacy cleartext ignores `code`.
 */
export async function decodeDeviceInvite(
  raw: string,
  code?: string,
): Promise<GitHubConfig | null> {
  const material = extractInviteMaterial(raw)
  if (!material) return null

  if (material.startsWith('{')) {
    try {
      return parseClearPayload(JSON.parse(material) as ClearPayload)
    } catch {
      return null
    }
  }

  for (const prefix of LEGACY_PREFIXES) {
    if (material.startsWith(prefix)) {
      try {
        const body = material.slice(prefix.length)
        const json = new TextDecoder().decode(base64ToBytes(body))
        return parseClearPayload(JSON.parse(json) as ClearPayload)
      } catch {
        return null
      }
    }
  }

  const envelope = decodeV2Blob(
    material.startsWith(V2_PREFIX) ? material : `${V2_PREFIX}${material}`,
  )
  if (envelope) {
    if (!code?.trim()) return null
    return decryptBlob(envelope, code)
  }

  return null
}
