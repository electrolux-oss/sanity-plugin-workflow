import { CheckmarkIcon } from '@sanity/icons/Checkmark'
import { useToast } from '@sanity/ui/toast'
import type { ToastContextValue } from '@sanity/ui/toast'
import { useCallback } from 'react'
import { useClient } from 'sanity'
import type { DocumentActionProps, SanityClient, DocumentActionDescription } from 'sanity'

import { useWorkflowContext } from '../components/WorkflowContext'
import { API_VERSION } from '../constants'
import { runWithToast } from '../helpers/runWithToast'

export function completeWorkflow(client: SanityClient, toast: ToastContextValue, id: string) {
  return runWithToast(toast, () => client.delete(`workflow-metadata.${id}`), {
    success: 'Workflow completed',
    error: 'Could not complete Workflow'
  })
}

export function useCompleteWorkflow({ id }: DocumentActionProps): DocumentActionDescription | null {
  const { metadata, loading, error, states } = useWorkflowContext(id)
  const client = useClient({ apiVersion: API_VERSION })
  const toast = useToast()

  const handle = useCallback(async () => {
    await completeWorkflow(client, toast, id)
  }, [client, toast, id])

  if (!metadata) {
    return null
  }

  const state = states.find(s => s.id === metadata.state)
  const isLastState = state?.id === states[states.length - 1]?.id

  return {
    icon: CheckmarkIcon,
    disabled: loading || Boolean(error) || !isLastState,
    label: `Complete Workflow`,
    title: isLastState
      ? `Ends the workflow for this document.`
      : `Cannot remove from workflow until in the last state`,
    onHandle: handle,
    tone: 'positive'
  }
}
