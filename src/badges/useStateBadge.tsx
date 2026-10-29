import { useWorkflowContext } from '../components/WorkflowContext'

import type { DocumentBadgeDescription, DocumentBadgeProps } from 'sanity'

export function useStateBadge({
  id: documentId
}: DocumentBadgeProps): DocumentBadgeDescription | null {
  const { metadata, loading, error, states } = useWorkflowContext(documentId)
  const state = states.find(s => s.id === metadata?.state)

  if (loading || error || !state) {
    return null
  }

  return {
    label: state.title,
    ...(state.color && { color: state.color })
  }
}
