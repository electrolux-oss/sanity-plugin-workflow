import { LexoRank } from 'lexorank'
import { describe, expect, it } from 'vitest'

import { doc } from './__fixtures__/documents'
import { getDropOrderRank } from './dropOrderRank'
import { generateMultipleOrderRanks } from './generateMultipleOrderRanks'

import type { SanityDocumentWithMetadata, State } from '../types'

const states: State[] = ['draft', 'review', 'approved'].map(id => ({
  id,
  title: id,
  transitions: []
}))

const [rankA, rankB, rankC, rankD] = generateMultipleOrderRanks(4).map(rank => rank.toString())

function item(id: string, state: string, orderRank: string) {
  return doc({ _id: id, metadata: { documentId: id, state, orderRank } })
}

const a = item('a', 'review', rankA)
const b = item('b', 'review', rankB)
const c = item('c', 'review', rankC)
const d = item('d', 'review', rankD)
const reviewColumn = [a, b, c, d]
const incoming = item('x', 'draft', rankA)

function dropIntoReview(
  draggableId: string,
  destinationIndex: number,
  columnItems: SanityDocumentWithMetadata[] = reviewColumn
) {
  return getDropOrderRank({
    data: [incoming, ...reviewColumn],
    columnItems,
    states,
    draggableId,
    destinationStateId: 'review',
    destinationIndex
  })
}

function isBetween(rank: string, lower: string, upper: string) {
  return rank.localeCompare(lower) > 0 && rank.localeCompare(upper) < 0
}

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

  it('gives only the first state the absolute minimum rank when the column is empty', () => {
    const options = { data: reviewColumn, columnItems: [], states, draggableId: 'a' }

    expect(getDropOrderRank({ ...options, destinationStateId: 'draft', destinationIndex: 0 })).toBe(
      LexoRank.min().toString()
    )
    expect(
      getDropOrderRank({ ...options, destinationStateId: 'approved', destinationIndex: 0 })
    ).toBe(LexoRank.min().genNext().toString())
  })
})
