import { describe, expect, it } from 'vitest'

import type { UserExtended } from '../hooks/useUsers'
import type { Metadata, State } from '../types'
import { doc } from './__fixtures__/documents'
import { countAffectedDocuments, findDataIssues, simulateDataIssues } from './dataIssues'
import { generateMultipleOrderRanks } from './generateMultipleOrderRanks'

const states: State[] = [
  { id: 'review', title: 'Review' },
  { id: 'approved', title: 'Approved' }
]
const users = [{ id: 'u1' }] as UserExtended[]
const [rankA, rankB] = generateMultipleOrderRanks(2).map(rank => rank.toString())

function item(id: string, metadata: Partial<Metadata> = {}) {
  return doc({
    _id: id,
    metadata: { documentId: id, state: 'review', orderRank: rankA, ...metadata }
  })
}

describe('findDataIssues', () => {
  it('finds nothing in healthy data', () => {
    const data = [item('a'), item('b', { orderRank: rankB, assignees: ['u1'] })]

    expect(countAffectedDocuments(findDataIssues(data, states, users))).toBe(0)
  })

  it('flags states the config no longer defines', () => {
    expect(findDataIssues([item('a', { state: 'gone' })], states, users).invalidStateIds).toEqual([
      'a'
    ])
  })

  it('flags assignees who are no longer project users', () => {
    const issues = findDataIssues([item('a', { assignees: ['u1', 'left'] })], states, users)

    expect(issues.invalidAssigneeIds).toEqual(['a'])
  })

  it('flags missing ranks and ranks duplicated within a State', () => {
    const data = [item('a'), item('b'), item('c', { orderRank: null })]

    expect(findDataIssues(data, states, users).orderIssueIds).toEqual(['a', 'b', 'c'])
  })

  it('allows the same rank in different States', () => {
    const data = [item('a'), item('b', { state: 'approved' })]

    expect(findDataIssues(data, states, users).orderIssueIds).toEqual([])
  })

  it('flags metadata whose document no longer exists', () => {
    const orphan = item('gone')
    // @ts-expect-error - modelling metadata whose document was deleted
    delete orphan._id

    expect(findDataIssues([orphan], states, users).orphanIds).toEqual(['gone'])
  })
})

describe('simulateDataIssues', () => {
  it('reports every kind of issue on real documents', () => {
    const issues = simulateDataIssues([item('a'), item('b'), item('c')])

    expect(issues.invalidStateIds.length).toBeGreaterThan(0)
    expect(issues.invalidAssigneeIds.length).toBeGreaterThan(0)
    expect(issues.orderIssueIds.length).toBeGreaterThan(0)
    expect(issues.orphanIds.length).toBeGreaterThan(0)
  })
})

describe('countAffectedDocuments', () => {
  it('counts a document with several issues once', () => {
    expect(
      countAffectedDocuments({
        invalidStateIds: ['a'],
        invalidAssigneeIds: ['a', 'b'],
        orderIssueIds: [],
        orphanIds: []
      })
    ).toBe(2)
  })
})
