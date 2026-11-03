import { LexoRank } from 'lexorank'
import { describe, expect, it } from 'vitest'

import type { SanityDocumentWithMetadata } from '../types'
import { doc } from './__fixtures__/documents'
import { generateMultipleOrderRanks } from './generateMultipleOrderRanks'
import { getDropOrderRank, rankBetween, rerankStates } from './ranking'

const [rankA, rankB, rankC, rankD] = generateMultipleOrderRanks(4).map(rank => rank.toString())

function item(id: string, state: string, orderRank: string | null) {
  return doc({ _id: id, metadata: { documentId: id, state, orderRank } })
}

const a = item('a', 'review', rankA)
const b = item('b', 'review', rankB)
const c = item('c', 'review', rankC)
const d = item('d', 'review', rankD)
const reviewColumn = [a, b, c, d]

function dropIntoReview(
  draggableId: string,
  destinationIndex: number,
  columnItems: SanityDocumentWithMetadata[] = reviewColumn
) {
  return getDropOrderRank({ columnItems, draggableId, destinationIndex })
}

function isBetween(rank: string, lower: string, upper: string) {
  return rank.localeCompare(lower) > 0 && rank.localeCompare(upper) < 0
}

describe('rankBetween', () => {
  it('places a rank strictly between its neighbours', () => {
    expect(isBetween(rankBetween(rankA, rankB), rankA, rankB)).toBe(true)
  })

  // Regression: an empty column, or the top or bottom of one, received LexoRank's absolute
  // minimum or maximum, so the next drop there produced a duplicate rank
  it('never returns the absolute minimum or maximum at the edges of a column', () => {
    expect(rankBetween(null, null)).toBe(LexoRank.middle().toString())
    expect(rankBetween(null, rankA)).not.toBe(LexoRank.min().toString())
    expect(rankBetween(rankD, null)).not.toBe(LexoRank.max().toString())
  })

  // Regression: LexoRank throws between equal ranks, so a drop between duplicates failed
  it('lands just after duplicate neighbours instead of throwing', () => {
    const rank = rankBetween(rankB, rankB)

    expect(rank.localeCompare(rankB)).toBeGreaterThan(0)
    expect(rank.localeCompare(rankC)).toBeLessThan(0)
  })
})

describe('getDropOrderRank', () => {
  it('places an item moved down its own column between its new neighbours', () => {
    expect(isBetween(dropIntoReview('a', 2), rankC, rankD)).toBe(true)
  })

  it('places an item moved up its own column between its new neighbours', () => {
    expect(isBetween(dropIntoReview('d', 1), rankA, rankB)).toBe(true)
  })

  it('places an item moved to the bottom of its own column after the last item', () => {
    expect(dropIntoReview('a', 3).localeCompare(rankD)).toBeGreaterThan(0)
  })

  it('places an item dropped at the end of another column after its last item', () => {
    expect(dropIntoReview('x', reviewColumn.length).localeCompare(rankD)).toBeGreaterThan(0)
  })

  it('places an item dropped at the top of a column before its first item', () => {
    expect(dropIntoReview('c', 0).localeCompare(rankA)).toBeLessThan(0)
  })

  it('ranks against the neighbours the user sees when filters hide part of the column', () => {
    expect(isBetween(dropIntoReview('x', 1, [b, d]), rankB, rankD)).toBe(true)
  })

  it('gives a document dropped into an empty column the middle rank', () => {
    expect(dropIntoReview('x', 0, [])).toBe(LexoRank.middle().toString())
  })
})

describe('rerankStates', () => {
  it('gives every document in the state a unique rank in its current order', () => {
    const duplicated = [item('a', 'review', rankA), item('b', 'review', rankA), c]

    const ranks = rerankStates(duplicated, ['review'])

    expect(ranks.map(r => r.documentId)).toEqual(['a', 'b', 'c'])
    expect(new Set(ranks.map(r => r.orderRank)).size).toBe(3)
    expect(ranks.map(r => r.orderRank).sort()).toEqual(ranks.map(r => r.orderRank))
  })

  it('leaves other states alone', () => {
    const ranks = rerankStates([a, item('x', 'draft', rankA)], ['review'])

    expect(ranks.map(r => r.documentId)).toEqual(['a'])
  })
})
