import type { EncryptedEnvelope, TandemState } from '@/types/tandem'

const PBKDF2_ITERATIONS = 100_000
const KEY_LENGTH_BITS = 256
const IV_BYTES = 12

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g)
  if (!matches) return new Uint8Array()
  return new Uint8Array(matches.map((b) => Number.parseInt(b, 16)))
}

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return bufToHex(salt)
}

async function deriveKey(
  password: string,
  saltHex: string,
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBuf(saltHex) as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptState(
  state: TandemState,
  password: string,
): Promise<EncryptedEnvelope> {
  const salt = state.salt || generateSalt()
  const key = await deriveKey(password, salt)
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const payload = new TextEncoder().encode(JSON.stringify({ ...state, salt }))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    payload,
  )
  return {
    v: 1,
    salt,
    iv: bufToBase64(iv),
    ciphertext: bufToBase64(ciphertext),
  }
}

export async function decryptEnvelope(
  envelope: EncryptedEnvelope,
  password: string,
): Promise<TandemState> {
  const key = await deriveKey(password, envelope.salt)
  const iv = base64ToBuf(envelope.iv)
  const ciphertext = base64ToBuf(envelope.ciphertext)
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    )
    const state = JSON.parse(new TextDecoder().decode(plain)) as TandemState
    state.salt = envelope.salt
    return state
  } catch {
    throw new Error('Invalid master password or corrupted vault.')
  }
}

/** Encrypt arbitrary JSON string with session-derived approach using password+salt */
export async function encryptJsonWithPassword(
  data: unknown,
  password: string,
  salt: string,
): Promise<string> {
  const key = await deriveKey(password, salt)
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const payload = new TextEncoder().encode(JSON.stringify(data))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    payload,
  )
  return JSON.stringify({
    v: 1,
    salt,
    iv: bufToBase64(iv),
    ciphertext: bufToBase64(ciphertext),
  } satisfies EncryptedEnvelope)
}

export async function decryptJsonWithPassword<T>(
  serialized: string,
  password: string,
): Promise<T> {
  const envelope = JSON.parse(serialized) as EncryptedEnvelope
  const key = await deriveKey(password, envelope.salt)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuf(envelope.iv) as BufferSource },
    key,
    base64ToBuf(envelope.ciphertext) as BufferSource,
  )
  return JSON.parse(new TextDecoder().decode(plain)) as T
}

export function parseEnvelope(raw: string): EncryptedEnvelope {
  const parsed = JSON.parse(raw) as EncryptedEnvelope
  if (parsed.v !== 1 || !parsed.salt || !parsed.iv || !parsed.ciphertext) {
    throw new Error('Unrecognized encrypted vault format.')
  }
  return parsed
}
