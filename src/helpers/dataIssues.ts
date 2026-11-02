import type { UserExtended } from '../hooks/useUsers'
import type { SanityDocumentWithMetadata, State } from '../types'

/** Workflow metadata problems the board can repair, as the ids of the documents they affect. */
export type DataIssues = {
  invalidStateIds: string[]
  invalidAssigneeIds: string[]
  orderIssueIds: string[]
  orphanIds: string[]
}

export function findDataIssues(
  data: SanityDocumentWithMetadata[],
  states: State[],
  userList: UserExtended[]
): DataIssues {
  const stateIds = new Set(states.map(s => s.id))
  const userIds = new Set(userList.map(u => u.id))

  // Ranks only order documents within their own State, so duplicates are counted per State
  const rankKey = (state: string | null, orderRank: string) => JSON.stringify([state, orderRank])
  const orderRankCounts = new Map<string, number>()

  for (const { _metadata } of data) {
    if (_metadata?.orderRank) {
      const key = rankKey(_metadata.state, _metadata.orderRank)
      orderRankCounts.set(key, (orderRankCounts.get(key) ?? 0) + 1)
    }
  }

  const issues: DataIssues = {
    invalidStateIds: [],
    invalidAssigneeIds: [],
    orderIssueIds: [],
    orphanIds: []
  }

  for (const item of data) {
    const { documentId, state, assignees, orderRank } = item._metadata ?? {}

    if (!documentId) {
      continue
    }

    if (!item._id) {
      issues.orphanIds.push(documentId)
    }

    if (!state || !stateIds.has(state)) {
      issues.invalidStateIds.push(documentId)
    }

    if (userList.length && assignees?.length && !assignees.every(a => userIds.has(a))) {
      issues.invalidAssigneeIds.push(documentId)
    }

    if (!orderRank || (orderRankCounts.get(rankKey(state, orderRank)) ?? 0) > 1) {
      issues.orderIssueIds.push(documentId)
    }
  }

  return issues
}

/**
 * Made-up issues on real documents, so the repair menu can be tried without broken data. Every
 * kind of issue is present as long as the board has a document.
 */
export function simulateDataIssues(data: SanityDocumentWithMetadata[]): DataIssues {
  const documentIds = data.filter(item => item._id).map(item => item._metadata.documentId)

  return {
    invalidStateIds: documentIds.slice(0, 1),
    invalidAssigneeIds: documentIds.slice(0, 2),
    orderIssueIds: documentIds.slice(0, 3),
    orphanIds: ['simulated-orphan']
  }
}

export function countAffectedDocuments(issues: DataIssues): number {
  return new Set([
    ...issues.invalidStateIds,
    ...issues.invalidAssigneeIds,
    ...issues.orderIssueIds,
    ...issues.orphanIds
  ]).size
}
