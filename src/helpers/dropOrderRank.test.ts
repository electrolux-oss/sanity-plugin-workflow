import { LexoRank } from 'lexorank'
import { describe, expect, it } from 'vitest'

import { doc } from './__fixtures__/documents'
import { getDropOrderRank } from './dropOrderRank'
import { generateMultipleOrderRanks } from './generateMultipleOrderRanks'

import type { State } from '../types'

const states: State[] = ['draft', 'review', 'approved'].map(id => ({
  id,
  title: id,
  transitions: []
}))

const [rankA, rankB, rankC, rankD] = generateMultipleOrderRanks(4).map(rank => rank.toString())

function reviewItem(id: string, orderRank: string) {
  return doc({ _id: id, metadata: { documentId: id, state: 'review', orderRank } })
}

const reviewColumn = [
  reviewItem('a', rankA),
  reviewItem('b', rankB),
  reviewItem('c', rankC),
  reviewItem('d', rankD)
]

function isBetween(rank: string, lower: string, upper: string) {
  return rank.localeCompare(lower) > 0 && rank.localeCompare(upper) < 0
}

describe('getDropOrderRank', () => {
  it('places an item moved down its own column between its new neighbours', () => {
    const rank = getDropOrderRank({
      data: reviewColumn,
      states,
      draggableId: 'a',
      destinationStateId: 'review',
      destinationIndex: 2
    })

    expect(isBetween(rank, rankC, rankD)).toBe(true)
  })

  it('places an item moved up its own column between its new neighbours', () => {
    const rank = getDropOrderRank({
      data: reviewColumn,
      states,
      draggableId: 'd',
      destinationStateId: 'review',
      destinationIndex: 1
    })

    expect(isBetween(rank, rankA, rankB)).toBe(true)
  })

  it('places an item moved to the bottom of its own column after the last item', () => {
    const rank = getDropOrderRank({
      data: reviewColumn,
      states,
      draggableId: 'a',
      destinationStateId: 'review',
      destinationIndex: 3
    })

    expect(rank.localeCompare(rankD)).toBeGreaterThan(0)
  })

  it('places an item dropped at the end of another column after its last item', () => {
    const incoming = doc({
      _id: 'x',
      metadata: { documentId: 'x', state: 'draft', orderRank: rankA }
    })

    const rank = getDropOrderRank({
      data: [incoming, ...reviewColumn],
      states,
      draggableId: 'x',
      destinationStateId: 'review',
      destinationIndex: reviewColumn.length
    })

    expect(rank.localeCompare(rankD)).toBeGreaterThan(0)
  })

  it('places an item dropped at the top of a column before its first item', () => {
    const rank = getDropOrderRank({
      data: reviewColumn,
      states,
      draggableId: 'c',
      destinationStateId: 'review',
      destinationIndex: 0
    })

    expect(rank.localeCompare(rankA)).toBeLessThan(0)
  })

  it('gives only the first state the absolute minimum rank when the column is empty', () => {
    const options = { data: reviewColumn, states, draggableId: 'a', destinationIndex: 0 }

    expect(getDropOrderRank({ ...options, destinationStateId: 'draft' })).toBe(
      LexoRank.min().toString()
    )
    expect(getDropOrderRank({ ...options, destinationStateId: 'approved' })).toBe(
      LexoRank.min().genNext().toString()
    )
  })
})
