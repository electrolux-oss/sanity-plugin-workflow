import { LexoRank } from 'lexorank'
import { describe, expect, it } from 'vitest'

import { generateMultipleOrderRanks } from './generateMultipleOrderRanks'
import initialRank from './initialRank'

describe('generateMultipleOrderRanks', () => {
  it('returns the requested number of ranks', () => {
    expect(generateMultipleOrderRanks(5)).toHaveLength(5)
  })

  it('returns ranks in ascending order', () => {
    const ranks = generateMultipleOrderRanks(8).map(r => r.toString())
    const sorted = [...ranks].sort((a, b) => a.localeCompare(b))

    expect(ranks).toEqual(sorted)
  })

  it('produces unique ranks so the Verify panel can repair duplicates', () => {
    const ranks = generateMultipleOrderRanks(12).map(r => r.toString())

    expect(new Set(ranks).size).toBe(ranks.length)
  })

  it('stays between the supplied bounds', () => {
    const start = LexoRank.min().genNext().genNext()
    const end = LexoRank.max().genPrev().genPrev()
    const ranks = generateMultipleOrderRanks(6, start, end).map(r => r.toString())

    expect(ranks[0]).toBe(start.toString())
    expect(ranks[ranks.length - 1]).toBe(end.toString())
  })
})

describe('initialRank', () => {
  it('generates a low rank when there is no previous value', () => {
    expect(initialRank()).toBe(LexoRank.min().genNext().genNext().toString())
  })

  it('generates a rank above the supplied one', () => {
    const previous = LexoRank.min().genNext().toString()
    const next = initialRank(previous)

    expect(next.localeCompare(previous)).toBeGreaterThan(0)
  })

  it('returns a string LexoRank can parse back', () => {
    expect(() => LexoRank.parse(initialRank('0|100000:'))).not.toThrow()
  })
})
