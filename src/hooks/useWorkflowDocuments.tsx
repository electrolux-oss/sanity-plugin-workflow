import type { DraggableLocation } from '@hello-pangea/dnd'
import React, { useCallback, useEffect } from 'react'
import { useClient } from 'sanity'
import { useListeningQuery } from 'sanity-plugin-utils'

import { useToast } from '@sanity/ui/toast'

import { API_VERSION } from '../constants'
import { runWithToast } from '../helpers/runWithToast'

import type { Metadata, SanityDocumentWithMetadata, State } from '../types'

const QUERY = `*[_type == "workflow.metadata" && (!defined($localeFilter) || count($localeFilter) == 0 || locale in $localeFilter)]|order(orderRank){
    "_metadata": {
      _rev,
      assignees,
      documentId,
      state,
      orderRank,
      locale,
      "draftDocumentId": "drafts." + documentId,
      "draftUpdatedAt": *[_id == "drafts." + ^.documentId][0]._updatedAt,
      "publishedUpdatedAt": *[_id == ^.documentId][0]._updatedAt,
    }
  }{
    ...,
    ...(
      *[_id == ^._metadata.documentId || _id == ^._metadata.draftDocumentId]|order(_updatedAt)[0]{ 
        _id, 
        _type, 
        _rev, 
        _updatedAt 
      }
    )
  }`

type WorkflowDocuments = {
  workflowData: {
    data: SanityDocumentWithMetadata[]
    loading: boolean
    error: unknown
  }
  operations: {
    move: (
      draggedId: string,
      destination: DraggableLocation,
      states: State[],
      newOrder: string
    ) => Promise<void>
  }
}

export function useWorkflowDocuments(localeFilter: string[]): WorkflowDocuments {
  const toast = useToast()
  const client = useClient({ apiVersion: API_VERSION })

  // Get and listen to changes on documents + workflow metadata documents
  const {
    data: _data,
    loading,
    error
  } = useListeningQuery<SanityDocumentWithMetadata[]>(QUERY, {
    params: { localeFilter },
    initialValue: []
  })

  const data = _data as SanityDocumentWithMetadata[]

  const [localDocuments, setLocalDocuments] = React.useState<SanityDocumentWithMetadata[]>([])

  useEffect(() => {
    if (data) {
      setLocalDocuments(data)
    }
  }, [data])

  const move = useCallback(
    async (
      draggedId: string,
      destination: DraggableLocation,
      states: State[],
      newOrder: string
    ) => {
      const newStateId = destination.droppableId
      const newState = states.find(s => s.id === newStateId)
      const document = localDocuments.find(d => d?._metadata?.documentId === draggedId)

      if (!newState) {
        toast.push({ title: `Could not find target state ${newStateId}`, status: 'error' })
        return
      }

      if (!document) {
        toast.push({ title: `Could not find dragged document in data`, status: 'error' })
        return
      }

      const { _metadata: previousMetadata } = document
      const updateDraggedMetadata = (metadata: Metadata) =>
        setLocalDocuments(current =>
          current.map(item =>
            item._metadata?.documentId === draggedId ? { ...item, _metadata: metadata } : item
          )
        )

      updateDraggedMetadata({ ...previousMetadata, state: newStateId, orderRank: newOrder })

      const moved = await runWithToast(
        toast,
        () =>
          client
            .patch(`workflow-metadata.${previousMetadata.documentId}`)
            .ifRevisionId(previousMetadata._rev)
            .set({ state: newStateId, orderRank: newOrder })
            .commit(),
        {
          success:
            newStateId === previousMetadata.state
              ? `Reordered in "${newState.title}"`
              : `Moved to "${newState.title}"`,
          error: `Failed to move to "${newState.title}"`
        }
      )

      if (!moved) {
        updateDraggedMetadata(previousMetadata)
      }
    },
    [client, toast, localDocuments]
  )

  return {
    workflowData: { data: localDocuments, loading, error },
    operations: { move }
  }
}
