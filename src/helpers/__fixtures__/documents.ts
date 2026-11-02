import type { SanityDocumentWithMetadata } from '../../types'

export function doc(
  overrides: Partial<SanityDocumentWithMetadata> & {
    metadata?: Partial<SanityDocumentWithMetadata['_metadata']>
  } = {}
): SanityDocumentWithMetadata {
  const { metadata, ...rest } = overrides

  return {
    _id: 'a',
    _type: 'article',
    _rev: 'rev',
    _updatedAt: '2026-01-01T00:00:00Z',
    ...rest,
    _metadata: {
      _id: 'workflow-metadata.a',
      _type: 'workflow.metadata',
      _rev: 'rev',
      documentId: 'a',
      state: 'inReview',
      orderRank: '0|a',
      assignees: [],
      locale: 'en',
      ...metadata
    } as SanityDocumentWithMetadata['_metadata']
  }
}
