import { describe, expect, it } from 'vitest'
import {
  decryptEnvelope,
  encryptState,
  generateSalt,
  parseEnvelope,
} from './crypto'
import { createInitialState } from './migration'

describe('crypto envelope', () => {
  it('round-trips encrypt → decrypt with the same password', async () => {
    const state = createInitialState({ withDemoData: false })
    const password = 'test-password-ok'
    const envelope = await encryptState(state, password)

    expect(envelope.v).toBe(1)
    expect(envelope.salt).toBe(state.salt)
    expect(envelope.iv).toBeTruthy()
    expect(envelope.ciphertext).toBeTruthy()

    const restored = await decryptEnvelope(envelope, password)
    expect(restored.version).toBe('1.0')
    expect(restored.salt).toBe(state.salt)
    expect(restored.settings.partnerAName).toBe(state.settings.partnerAName)
    expect(restored.history).toEqual({})
  })

  it('rejects a wrong password', async () => {
    const state = createInitialState({ withDemoData: false })
    const envelope = await encryptState(state, 'correct-horse')
    await expect(decryptEnvelope(envelope, 'wrong-battery')).rejects.toThrow(
      /Invalid master password/,
    )
  })

  it('parseEnvelope accepts v1 and rejects bad payloads', () => {
    const ok = parseEnvelope(
      JSON.stringify({
        v: 1,
        salt: generateSalt(),
        iv: 'YWJj',
        ciphertext: 'ZGVm',
      }),
    )
    expect(ok.v).toBe(1)

    expect(() => parseEnvelope(JSON.stringify({ v: 2, salt: 'x' }))).toThrow(
      /Unrecognized encrypted vault/,
    )
  })
})
