import { LexoRank } from 'lexorank'
import React from 'react'
import { useClient } from 'sanity'

import { Button } from '@sanity/ui'
import { useToast } from '@sanity/ui/toast'

import { API_VERSION } from '../constants'
import { generateMultipleOrderRanks } from '../helpers/generateMultipleOrderRanks'
import FloatingCard from './FloatingCard'

import type { UserExtended } from '../hooks/useUsers'

import type { SanityDocumentWithMetadata, State } from '../types'
type VerifyProps = {
  data: SanityDocumentWithMetadata[]
  userList: UserExtended[]
  states: State[]
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
    documentsWithoutOrderIds,
    documentsWithDuplicatedOrderIds
  } = React.useMemo(() => {
    const stateIds = new Set(states.map(s => s.id))
    const userIds = new Set(userList.map(u => u.id))

    const orderRankCounts = new Map<string, number>()
    for (const item of data) {
      const { orderRank } = item._metadata ?? {}

      if (orderRank) {
        orderRankCounts.set(orderRank, (orderRankCounts.get(orderRank) ?? 0) + 1)
      }
    }

    const withoutValidMetadata: string[] = []
    const withInvalidUsers: string[] = []
    const withoutOrder: string[] = []
    const withDuplicatedOrder: string[] = []

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

      if (!orderRank) {
        withoutOrder.push(documentId)
      } else if ((orderRankCounts.get(orderRank) ?? 0) > 1) {
        withDuplicatedOrder.push(documentId)
      }
    }

    return {
      documentsWithoutValidMetadataIds: withoutValidMetadata,
      documentsWithInvalidUserIds: withInvalidUsers,
      documentsWithoutOrderIds: withoutOrder,
      documentsWithDuplicatedOrderIds: withDuplicatedOrder
    }
  }, [data, states, userList])

  // Updates metadata documents to a valid, existing state
  const correctDocuments = React.useCallback(
    async (ids: string[]) => {
      const firstState = states[0]

      if (!firstState) {
        return
      }

      toast.push({
        title: 'Correcting...',
        status: 'info'
      })

      const tx = ids.reduce((item, documentId) => {
        return item.patch(`workflow-metadata.${documentId}`, {
          set: { state: firstState.id }
        })
      }, client.transaction())

      await tx.commit()

      toast.push({
        title: `Corrected ${ids.length === 1 ? `1 Document` : `${ids.length} Documents`}`,
        status: 'success'
      })
    },
    [client, states, toast]
  )

  // Remove users that are no longer in the project from documents
  const removeUsersFromDocuments = React.useCallback(
    async (ids: string[]) => {
      toast.push({
        title: 'Removing users...',
        status: 'info'
      })

      const userIds = new Set(userList.map(u => u.id))

      const tx = ids.reduce((item, documentId) => {
        const { assignees } = data.find(d => d._metadata?.documentId === documentId)?._metadata ?? {}
        const validAssignees = assignees?.length
          ? // eslint-disable-next-line max-nested-callbacks
            assignees.filter(a => userIds.has(a))
          : []

        return item.patch(`workflow-metadata.${documentId}`, {
          set: { assignees: validAssignees }
        })
      }, client.transaction())

      await tx.commit()

      toast.push({
        title: `Corrected ${ids.length === 1 ? `1 Document` : `${ids.length} Documents`}`,
        status: 'success'
      })
    },
    [client, data, toast, userList]
  )

  // Add order value to metadata documents
  const addOrderToDocuments = React.useCallback(
    async (ids: string[]) => {
      toast.push({
        title: 'Adding ordering...',
        status: 'info'
      })

      // Get first and second order values, if they exist
      const [firstOrder, secondOrder] = [...data].slice(0, 2).map(d => d._metadata?.orderRank)
      const minLexo = firstOrder ? LexoRank.parse(firstOrder) : undefined
      const maxLexo = secondOrder ? LexoRank.parse(secondOrder) : undefined
      const ranks = generateMultipleOrderRanks(ids.length, minLexo, maxLexo)

      const tx = client.transaction()

      // Create a new in-between value for each document
      for (let index = 0; index < ids.length; index += 1) {
        tx.patch(`workflow-metadata.${ids[index]}`, {
          set: { orderRank: ranks[index].toString() }
        })
      }

      await tx.commit()

      toast.push({
        title: `Added order to ${ids.length === 1 ? `1 Document` : `${ids.length} Documents`}`,
        status: 'success'
      })
    },
    [data, client, toast]
  )

  // Reset order value on all metadata documents
  const resetOrderOfAllDocuments = React.useCallback(
    async (ids: string[]) => {
      toast.push({
        title: 'Adding ordering...',
        status: 'info'
      })

      const ranks = generateMultipleOrderRanks(ids.length)

      const tx = client.transaction()

      // Create a new in-between value for each document
      for (let index = 0; index < ids.length; index += 1) {
        tx.patch(`workflow-metadata.${ids[index]}`, {
          set: { orderRank: ranks[index].toString() }
        })
      }

      await tx.commit()

      toast.push({
        title: `Added order to ${ids.length === 1 ? `1 Document` : `${ids.length} Documents`}`,
        status: 'success'
      })
    },
    [client, toast]
  )

  // A document could be deleted and the workflow metadata left behind
  const orphanedMetadataDocumentIds = React.useMemo(() => {
    return data.length ? data.filter(doc => !doc?._id).map(doc => doc._metadata.documentId) : []
  }, [data])

  const handleOrphans = React.useCallback(async () => {
    toast.push({
      title: 'Removing orphaned metadata...',
      status: 'info'
    })

    const tx = client.transaction()
    orphanedMetadataDocumentIds.forEach(id => {
      tx.delete(`workflow-metadata.${id}`)
    })

    try {
      await tx.commit()

      toast.push({
        title: `Removed ${orphanedMetadataDocumentIds.length} orphaned metadata documents`,
        status: 'success'
      })
    } catch (err) {
      console.error(err)

      toast.push({
        title: 'Failed to remove orphaned metadata',
        status: 'error'
      })
    }
  }, [client, orphanedMetadataDocumentIds, toast])

  return (
    <FloatingCard>
      {documentsWithoutValidMetadataIds.length > 0 ? (
        <Button
          tone="caution"
          mode="ghost"
          onClick={() => correctDocuments(documentsWithoutValidMetadataIds)}
          text={
            documentsWithoutValidMetadataIds.length === 1
              ? `Correct 1 Document State`
              : `Correct ${documentsWithoutValidMetadataIds.length} Document States`
          }
        />
      ) : null}
      {documentsWithInvalidUserIds.length > 0 ? (
        <Button
          tone="caution"
          mode="ghost"
          onClick={() => removeUsersFromDocuments(documentsWithInvalidUserIds)}
          text={
            documentsWithInvalidUserIds.length === 1
              ? `Remove Invalid Users from 1 Document`
              : `Remove Invalid Users from ${documentsWithInvalidUserIds.length} Documents`
          }
        />
      ) : null}
      {documentsWithoutOrderIds.length > 0 ? (
        <Button
          tone="caution"
          mode="ghost"
          onClick={() => addOrderToDocuments(documentsWithoutOrderIds)}
          text={
            documentsWithoutOrderIds.length === 1
              ? `Set Order for 1 Document`
              : `Set Order for ${documentsWithoutOrderIds.length} Documents`
          }
        />
      ) : null}
      {documentsWithDuplicatedOrderIds.length > 0 ? (
        <>
          <Button
            tone="caution"
            mode="ghost"
            onClick={() => addOrderToDocuments(documentsWithDuplicatedOrderIds)}
            text={
              documentsWithDuplicatedOrderIds.length === 1
                ? `Set Unique Order for 1 Document`
                : `Set Unique Order for ${documentsWithDuplicatedOrderIds.length} Documents`
            }
          />
          <Button
            tone="caution"
            mode="ghost"
            onClick={() =>
              resetOrderOfAllDocuments(data.map(doc => String(doc._metadata?.documentId)))
            }
            text={
              data.length === 1
                ? `Reset Order for 1 Document`
                : `Reset Order for all ${data.length} Documents`
            }
          />
        </>
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
