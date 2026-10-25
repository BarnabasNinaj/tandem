import { describe, expect, it } from 'vitest'
import {
  createDeviceInvite,
  decodeDeviceInvite,
  extractInviteMaterial,
  formatPairingCode,
  generatePairingCode,
  isEncryptedInvite,
  isLegacyCleartextInvite,
  normalizePairingCode,
} from './device-invite'

const config = {
  username: 'Ada',
  repo: 'tandem-data',
  pat: 'github_pat_test_token',
}

describe('device invite', () => {
  it('creates HTTPS link with encrypted hash (no clear PAT)', async () => {
    const invite = await createDeviceInvite(config, 'https://tandem.example')
    expect(invite.url.startsWith('https://tandem.example/#i=TANDEM2.')).toBe(
      true,
    )
    expect(invite.url.includes('?')).toBe(false)
    expect(invite.url.includes(config.pat)).toBe(false)
    expect(invite.url.includes(config.username)).toBe(false)
    expect(invite.code).toHaveLength(10)
    expect(isEncryptedInvite(invite.blob)).toBe(true)
  })

  it('round-trips with pairing code', async () => {
    const invite = await createDeviceInvite(config, 'https://tandem.example')
    const decoded = await decodeDeviceInvite(invite.url, invite.code)
    expect(decoded).toEqual(config)
  })

  it('accepts formatted pairing code with dashes', async () => {
    const invite = await createDeviceInvite(config, 'https://tandem.example')
    const formatted = formatPairingCode(invite.code)
    expect(await decodeDeviceInvite(invite.url, formatted)).toEqual(config)
  })

  it('accepts blob paste + code', async () => {
    const invite = await createDeviceInvite(config, 'https://tandem.example')
    expect(await decodeDeviceInvite(invite.blob, invite.code)).toEqual(config)
  })

  it('rejects wrong pairing code', async () => {
    const invite = await createDeviceInvite(config, 'https://tandem.example')
    expect(await decodeDeviceInvite(invite.url, 'WRONGCODE1')).toBeNull()
  })

  it('rejects encrypted invite without code', async () => {
    const invite = await createDeviceInvite(config, 'https://tandem.example')
    expect(await decodeDeviceInvite(invite.url)).toBeNull()
  })

  it('extracts material from hash URL only', async () => {
    const invite = await createDeviceInvite(config, 'https://tandem.example')
    expect(extractInviteMaterial(invite.url)).toBe(invite.blob)
  })

  it('rejects query-string invite transport', () => {
    expect(
      extractInviteMaterial('https://tandem.example/?i=TANDEM2.abc'),
    ).toBeNull()
  })

  it('stores PBKDF2 iteration count on new blobs', async () => {
    const invite = await createDeviceInvite(config, 'https://tandem.example')
    const body = invite.blob.slice('TANDEM2.'.length)
    const padded = body.replace(/-/g, '+').replace(/_/g, '/')
    const pad =
      padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(padded + pad), (c) => c.charCodeAt(0)),
    )
    const parsed = JSON.parse(json) as { i?: number }
    expect(parsed.i).toBe(300_000)
  })

  it('ignores tampered low iteration counts (no downgrade)', async () => {
    const invite = await createDeviceInvite(config, 'https://tandem.example')
    const body = invite.blob.slice('TANDEM2.'.length)
    const padded = body.replace(/-/g, '+').replace(/_/g, '/')
    const pad =
      padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
    const parsed = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(padded + pad), (c) => c.charCodeAt(0)),
      ),
    ) as { v: 2; s: string; iv: string; c: string; i?: number }
    parsed.i = 1
    const tamperedJson = JSON.stringify(parsed)
    const tamperedB64 = btoa(tamperedJson)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const tampered = `TANDEM2.${tamperedB64}`
    // Correct code still works only if we use policy iterations (300k), not i=1.
    expect(await decodeDeviceInvite(tampered, invite.code)).toEqual(config)
  })

  it('generatePairingCode uses safe alphabet', () => {
    const code = generatePairingCode()
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/)
    expect(normalizePairingCode(formatPairingCode(code))).toBe(code)
  })

  it('still decodes legacy TANDEM1 cleartext', async () => {
    const json = JSON.stringify({
      v: 1,
      u: 'Ada',
      r: 'tandem-data',
      p: 'github_pat_test_token',
    })
    const b64 = btoa(json)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const legacy = `TANDEM1.${b64}`
    expect(isLegacyCleartextInvite(legacy)).toBe(true)
    expect(await decodeDeviceInvite(legacy)).toEqual(config)
  })

  it('still decodes legacy tandem-device: prefix', async () => {
    const json = JSON.stringify({
      v: 1,
      u: 'Ada',
      r: 'tandem-data',
      p: 'github_pat_test_token',
    })
    const b64 = btoa(json)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(await decodeDeviceInvite(`tandem-device:${b64}`)).toEqual(config)
  })

  it('accepts raw JSON invite shape', async () => {
    const decoded = await decodeDeviceInvite(
      JSON.stringify({
        v: 1,
        u: 'Ada',
        r: 'tandem-data',
        p: 'github_pat_test_token',
      }),
    )
    expect(decoded).toEqual(config)
  })

  it('rejects junk', async () => {
    expect(await decodeDeviceInvite('')).toBeNull()
    expect(await decodeDeviceInvite('not-an-invite')).toBeNull()
    expect(
      await decodeDeviceInvite(JSON.stringify({ v: 1, u: 'x' })),
    ).toBeNull()
  })
})
