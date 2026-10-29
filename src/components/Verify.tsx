import React from 'react'
import { useClient } from 'sanity'

import { Button } from '@sanity/ui'
import { useToast } from '@sanity/ui/toast'

import { API_VERSION } from '../constants'
import { rerankStates } from '../helpers/ranking'
import { runWithToast } from '../helpers/runWithToast'
import FloatingCard from './FloatingCard'

import type { UserExtended } from '../hooks/useUsers'

import type { SanityDocumentWithMetadata, State } from '../types'

type VerifyProps = {
  data: SanityDocumentWithMetadata[]
  userList: UserExtended[]
  states: State[]
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

// This component checks the validity of the data in the Kanban
// It will only render something it there is invalid date
// And will render buttons to fix the data
export default function Verify(props: VerifyProps) {
  const { data, userList, states } = props
  const client = useClient({ apiVersion: API_VERSION })
  const toast = useToast()

  // A lot of error-checking, in a single pass over the data
  const {
    documentsWithoutValidMetadataIds,
    documentsWithInvalidUserIds,
    documentsWithOrderIssueIds
  } = React.useMemo(() => {
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

    const withoutValidMetadata: string[] = []
    const withInvalidUsers: string[] = []
    const withOrderIssue: string[] = []

    for (const item of data) {
      const { documentId, state, assignees, orderRank } = item._metadata ?? {}

      if (!documentId) {
        continue
      }

      if (!state || !stateIds.has(state)) {
        withoutValidMetadata.push(documentId)
      }

      if (userList.length && assignees?.length && !assignees.every(a => userIds.has(a))) {
        withInvalidUsers.push(documentId)
      }

      if (!orderRank || (orderRankCounts.get(rankKey(state, orderRank)) ?? 0) > 1) {
        withOrderIssue.push(documentId)
      }
    }

    return {
      documentsWithoutValidMetadataIds: withoutValidMetadata,
      documentsWithInvalidUserIds: withInvalidUsers,
      documentsWithOrderIssueIds: withOrderIssue
    }
  }, [data, states, userList])

  const commitPatches = React.useCallback(
    (ids: string[], buildPatch: (documentId: string, index: number) => Record<string, unknown>) => {
      const tx = client.transaction()

      ids.forEach((documentId, index) => {
        tx.patch(`workflow-metadata.${documentId}`, { set: buildPatch(documentId, index) })
      })

      return tx.commit()
    },
    [client]
  )

  // Updates metadata documents to a valid, existing state
  const correctDocuments = React.useCallback(
    (ids: string[]) => {
      const firstState = states[0]

      if (!firstState) {
        return
      }

      runWithToast(toast, () => commitPatches(ids, () => ({ state: firstState.id })), {
        pending: 'Correcting...',
        success: `Corrected ${plural(ids.length, 'Document')}`,
        error: 'Could not correct Document states'
      })
    },
    [commitPatches, states, toast]
  )

  // Remove users that are no longer in the project from documents
  const removeUsersFromDocuments = React.useCallback(
    (ids: string[]) => {
      const userIds = new Set(userList.map(u => u.id))
      const assigneesById = new Map(
        data.map(d => [d._metadata?.documentId, d._metadata?.assignees])
      )

      runWithToast(
        toast,
        () =>
          commitPatches(ids, documentId => ({
            assignees: (assigneesById.get(documentId) ?? []).filter(a => userIds.has(a))
          })),
        {
          pending: 'Removing users...',
          success: `Corrected ${plural(ids.length, 'Document')}`,
          error: 'Could not remove invalid users'
        }
      )
    },
    [commitPatches, data, toast, userList]
  )

  // Re-ranks the States containing the given documents, keeping their current order
  const fixOrderOfDocuments = React.useCallback(
    (ids: string[]) => {
      const affectedIds = new Set(ids)
      const affectedStateIds = data
        .filter(d => affectedIds.has(d._metadata?.documentId))
        .flatMap(d => (d._metadata?.state ? [d._metadata.state] : []))
      const ranks = rerankStates(data, affectedStateIds)

      runWithToast(
        toast,
        () =>
          commitPatches(
            ranks.map(r => r.documentId),
            (_, index) => ({ orderRank: ranks[index].orderRank })
          ),
        {
          pending: 'Fixing order...',
          success: `Fixed order of ${plural(ranks.length, 'Document')}`,
          error: 'Could not fix Document order'
        }
      )
    },
    [commitPatches, data, toast]
  )

  // A document could be deleted and the workflow metadata left behind
  const orphanedMetadataDocumentIds = React.useMemo(
    () => data.filter(doc => !doc?._id).map(doc => doc._metadata.documentId),
    [data]
  )

  const handleOrphans = React.useCallback(() => {
    const tx = client.transaction()

    orphanedMetadataDocumentIds.forEach(id => {
      tx.delete(`workflow-metadata.${id}`)
    })

    runWithToast(toast, () => tx.commit(), {
      pending: 'Removing orphaned metadata...',
      success: `Removed ${plural(
        orphanedMetadataDocumentIds.length,
        'orphaned metadata document'
      )}`,
      error: 'Failed to remove orphaned metadata'
    })
  }, [client, orphanedMetadataDocumentIds, toast])

  return (
    <FloatingCard>
      {documentsWithoutValidMetadataIds.length > 0 ? (
        <Button
          tone="caution"
          mode="ghost"
          onClick={() => correctDocuments(documentsWithoutValidMetadataIds)}
          text={`Correct ${plural(documentsWithoutValidMetadataIds.length, 'Document State')}`}
        />
      ) : null}
      {documentsWithInvalidUserIds.length > 0 ? (
        <Button
          tone="caution"
          mode="ghost"
          onClick={() => removeUsersFromDocuments(documentsWithInvalidUserIds)}
          text={`Remove Invalid Users from ${plural(
            documentsWithInvalidUserIds.length,
            'Document'
          )}`}
        />
      ) : null}
      {documentsWithOrderIssueIds.length > 0 ? (
        <Button
          tone="caution"
          mode="ghost"
          onClick={() => fixOrderOfDocuments(documentsWithOrderIssueIds)}
          text={`Fix Order for ${plural(documentsWithOrderIssueIds.length, 'Document')}`}
        />
      ) : null}
      {orphanedMetadataDocumentIds.length > 0 ? (
        <Button
          text="Cleanup orphaned metadata"
          onClick={handleOrphans}
          tone="caution"
          mode="ghost"
        />
      ) : null}
    </FloatingCard>
  )
}
