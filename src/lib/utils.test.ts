import { describe, it, expect } from 'vitest'
import { cn, randomToken } from './utils'

describe('cn (class merger)', () => {
  it('merges tailwind classes and dedupes conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-red-500', { 'text-blue-500': true })).toBe('text-blue-500')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })
})

describe('randomToken', () => {
  it('produces a token of the requested length', () => {
    expect(randomToken(8)).toHaveLength(8)
    expect(randomToken(16)).toHaveLength(16)
  })

  it('produces hex-only output (compatible with file paths)', () => {
    const t = randomToken(16)
    expect(t).toMatch(/^[0-9a-f]+$/)
  })

  it('produces distinct tokens across calls', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => randomToken(12)))
    expect(tokens.size).toBe(50)
  })
})
