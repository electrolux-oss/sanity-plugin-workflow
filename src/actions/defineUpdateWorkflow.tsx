import { ArrowLeftIcon } from '@sanity/icons/ArrowLeft'
import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { useToast } from '@sanity/ui/toast'
import { useClient, useCurrentUser, useValidationStatus } from 'sanity'
import type { DocumentActionProps, DocumentActionDescription } from 'sanity'

import { useWorkflowContext } from '../components/WorkflowContext'
import { API_VERSION } from '../constants'
import { getTransitionBlocker } from '../helpers/permissions'
import type { TransitionBlocker } from '../helpers/permissions'
import { runWithToast } from '../helpers/runWithToast'
import type { State } from '../types'

function useUpdateWorkflow(
  { id, type, draft, version }: DocumentActionProps,
  actionState: State
): DocumentActionDescription | null {
  const user = useCurrentUser()
  const client = useClient({ apiVersion: API_VERSION })
  const toast = useToast()

  const { metadata, loading, error, states } = useWorkflowContext(id)
  const currentState = states.find(s => s.id === metadata?.state)

  // Validate the version the editor is actually working on. Sanity derives the validation
  // target from the id it is given, so passing the published id would gate transitions on
  // the published document's markers rather than the in-progress ones.
  const { validation, isValidating } = useValidationStatus(
    version?._id ?? draft?._id ?? id,
    type,
    false
  )
  const hasValidationErrors = Boolean(
    currentState?.requireValidation && !isValidating && validation.some(v => v.level === 'error')
  )

  const onHandle = async (documentId: string, newState: State) => {
    await runWithToast(
      toast,
      () => client.patch(`workflow-metadata.${documentId}`).set({ state: newState.id }).commit(),
      { success: `Document state now "${newState.title}"`, error: 'Document state update failed' }
    )
  }

  // Remove button if:
  // Document is not in Workflow OR
  // The current State is the same as this actions State
  if (!metadata || (currentState && currentState.id === actionState.id)) {
    return null
  }

  const currentStateIndex = states.findIndex(s => s.id === currentState?.id)
  const actionStateIndex = states.findIndex(s => s.id === actionState.id)
  const direction = actionStateIndex > currentStateIndex ? 'promote' : 'demote'
  const DirectionIcon = direction === 'promote' ? ArrowRightIcon : ArrowLeftIcon
  const directionLabel = direction === 'promote' ? 'Promote' : 'Demote'

  const blocker =
    currentState &&
    getTransitionBlocker({
      from: currentState,
      to: actionState,
      userId: user?.id,
      userRoleNames: user?.roles?.map(r => r.name) ?? [],
      assignees: metadata.assignees
    })
  const isAwaitingValidation = Boolean(currentState?.requireValidation && isValidating)
  const action = `${directionLabel} State to "${actionState.title}"`
  const blockedTitles: Record<TransitionBlocker, string> = {
    role: `Your User role cannot ${action}`,
    transition: `You cannot ${action} from "${currentState?.title}"`,
    assignment: `You must be assigned to the document to ${action}`
  }

  let title = action

  if (blocker) {
    title = blockedTitles[blocker]
  } else if (isAwaitingValidation) {
    title = `Document is validating, cannot ${action}`
  } else if (hasValidationErrors) {
    title = `Document has validation errors, cannot ${action}`
  }

  return {
    icon: DirectionIcon,
    disabled:
      loading ||
      Boolean(error) ||
      !currentState ||
      Boolean(blocker) ||
      isAwaitingValidation ||
      hasValidationErrors,
    title,
    label: actionState.title,
    onHandle: () => onHandle(id, actionState)
  }
}

export function defineUpdateWorkflow(
  actionState: State
): (props: DocumentActionProps) => DocumentActionDescription | null {
  return (props: DocumentActionProps) => useUpdateWorkflow(props, actionState)
}
