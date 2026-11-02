import { useMemo } from 'react'
import { useListeningQuery } from 'sanity-plugin-utils'

import { API_VERSION } from '../constants'

import type { KeyedMetadata, Metadata } from '../types'

/**
 * Takes the published ID of documents and return the metadata for those documents.
 *
 * @param ids Source document published IDs
 */
export function useWorkflowMetadata(ids: string[]): {
  data: KeyedMetadata
  loading: boolean
  error: boolean | unknown | ProgressEvent
} {
  const {
    data: _rawData,
    loading,
    error
  } = useListeningQuery<Metadata[]>(
    `*[_type == "workflow.metadata" && documentId in $ids]{
      _id,
      _type,
      _rev,
      assignees,
      documentId,
      state,
      orderRank,
      locale
    }`,
    {
      params: { ids },
      options: { apiVersion: API_VERSION }
    }
  )

  const rawData = _rawData as Metadata[]

  const keyedMetadata = useMemo(() => {
    if (!rawData?.length) {
      return {}
    }

    const keyed: KeyedMetadata = {}

    for (const metadata of rawData) {
      keyed[metadata.documentId] = metadata
    }

    return keyed
  }, [rawData])

  return { data: keyedMetadata, loading, error }
}
