import type { Metadata } from '../types'

/**
 * Sanity picks the validation target from the id it is given, so validate the draft
 * when one exists, otherwise the card reports the published document's markers.
 */
export function getValidationId({
  documentId,
  draftDocumentId,
  draftUpdatedAt
}: Pick<Metadata, 'documentId' | 'draftDocumentId' | 'draftUpdatedAt'>): string {
  return draftUpdatedAt ? (draftDocumentId ?? `drafts.${documentId}`) : documentId
}
