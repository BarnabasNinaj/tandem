import { describe, expect, it } from 'vitest'
import { decodeDeviceInvite, encodeDeviceInvite } from './device-invite'

const config = {
  username: 'Ada',
  repo: 'tandem-data',
  pat: 'github_pat_test_token',
}

describe('device invite', () => {
  it('round-trips encode → decode', () => {
    const encoded = encodeDeviceInvite(config)
    expect(encoded.startsWith('tandem-device:')).toBe(true)

    const decoded = decodeDeviceInvite(encoded)
    expect(decoded).toEqual({
      username: 'Ada',
      repo: 'tandem-data',
      pat: 'github_pat_test_token',
    })
  })

  it('accepts payload without prefix', () => {
    const encoded = encodeDeviceInvite(config)
    const bare = encoded.slice('tandem-device:'.length)
    expect(decodeDeviceInvite(bare)).toEqual(config)
  })

  it('accepts raw JSON invite shape', () => {
    const decoded = decodeDeviceInvite(
      JSON.stringify({
        v: 1,
        u: 'Ada',
        r: 'tandem-data',
        p: 'github_pat_test_token',
      }),
    )
    expect(decoded).toEqual(config)
  })

  it('rejects junk', () => {
    expect(decodeDeviceInvite('')).toBeNull()
    expect(decodeDeviceInvite('not-an-invite')).toBeNull()
    expect(decodeDeviceInvite(JSON.stringify({ v: 1, u: 'x' }))).toBeNull()
  })
})
