import { useClient, useCurrentUser, useValidationStatus } from 'sanity'

import { ArrowLeftIcon } from '@sanity/icons/ArrowLeft'
import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { useToast } from '@sanity/ui/toast'

import { useWorkflowContext } from '../components/WorkflowContext'
import { API_VERSION } from '../constants'
import { arraysContainMatchingString } from '../helpers/arraysContainMatchingString'

import type { State } from '../types'
import type { DocumentActionProps, DocumentActionDescription } from 'sanity'

// eslint-disable-next-line complexity
function useUpdateWorkflow(
  { id, type, draft, version, onComplete }: DocumentActionProps,
  actionState: State
): DocumentActionDescription | null {
  const user = useCurrentUser()
  const client = useClient({ apiVersion: API_VERSION })
  const toast = useToast()

  const { metadata, loading, error, states } = useWorkflowContext(id)
  const currentState = states.find(s => s.id === metadata?.state)
  const { assignees = [] } = metadata ?? {}

  // Validate the version the editor is actually working on. Sanity derives the validation
  // target from the id it is given, so passing the published id would gate transitions on
  // the published document's markers rather than the in-progress ones.
  const { validation, isValidating } = useValidationStatus(
    version?._id ?? draft?._id ?? id,
    type,
    false
  )
  const hasValidationErrors =
    currentState?.requireValidation &&
    !isValidating &&
    validation?.length > 0 &&
    validation.find(v => v.level === 'error')

  if (error) {
    console.error(error)
  }

  const onHandle = (documentId: string, newState: State) => {
    client
      .patch(`workflow-metadata.${documentId}`)
      .set({ state: newState.id })
      .commit()
      .then(() => {
        onComplete()
        toast.push({
          status: 'success',
          title: `Document state now "${newState.title}"`
        })
      })
      .catch(err => {
        onComplete()
        console.error(err)
        toast.push({
          status: 'error',
          title: `Document state update failed`
        })
      })
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

  const userRoleCanUpdateState =
    user?.roles?.length && actionState?.roles?.length
      ? // If the Action state is limited to specific roles
        // check that the current user has one of those roles
        arraysContainMatchingString(
          user.roles.map(r => r.name),
          actionState.roles
        )
      : // No roles specified on the next state, so anyone can update
        actionState?.roles?.length !== 0

  const actionStateIsAValidTransition =
    currentState?.id && currentState?.transitions?.length
      ? // If the Current State limits transitions to specific States
        // Check that the Action State is in Current State's transitions array
        currentState.transitions.includes(actionState.id)
      : // Otherwise this isn't a problem
        true

  const userAssignmentCanUpdateState = actionState.requireAssignment
    ? // If the Action State requires assigned users
      // Check the current user ID is in the assignees array
      user && assignees?.length && assignees.includes(user.id)
    : // Otherwise this isn't a problem
      true

  let title = `${directionLabel} State to "${actionState.title}"`

  if (!userRoleCanUpdateState) {
    title = `Your User role cannot ${directionLabel} State to "${actionState.title}"`
  } else if (!actionStateIsAValidTransition) {
    title = `You cannot ${directionLabel} State to "${actionState.title}" from "${currentState?.title}"`
  } else if (!userAssignmentCanUpdateState) {
    title = `You must be assigned to the document to ${directionLabel} State to "${actionState.title}"`
  } else if (currentState?.requireValidation && isValidating) {
    title = `Document is validating, cannot ${directionLabel} State to "${actionState.title}"`
  } else if (hasValidationErrors) {
    title = `Document has validation errors, cannot ${directionLabel} State to "${actionState.title}"`
  }

  return {
    icon: DirectionIcon,
    disabled:
      loading ||
      Boolean(error) ||
      (currentState?.requireValidation && isValidating) ||
      Boolean(hasValidationErrors) ||
      !currentState ||
      !userRoleCanUpdateState ||
      !actionStateIsAValidTransition ||
      !userAssignmentCanUpdateState,
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
