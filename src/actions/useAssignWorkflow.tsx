import { useState } from 'react'
import { useCurrentUser } from 'sanity'

import { UsersIcon } from '@sanity/icons/Users'

import UserAssignment from '../components/UserAssignment'
import { useWorkflowContext } from '../components/WorkflowContext'
import { cannotChangeAssigneesMessage, hasAnyRole } from '../helpers/permissions'

import type { DocumentActionProps, DocumentActionDescription } from 'sanity'

export function useAssignWorkflow({ id }: DocumentActionProps): DocumentActionDescription | null {
  const { metadata, loading, error, states } = useWorkflowContext(id)
  const user = useCurrentUser()
  const [isDialogOpen, setDialogOpen] = useState(false)

  if (!metadata) {
    return null
  }

  const state = states.find(s => s.id === metadata.state)
  const canChangeAssignees = hasAnyRole(user?.roles.map(r => r.name) ?? [], state?.roles)

  return {
    icon: UsersIcon,
    disabled: loading || Boolean(error) || !canChangeAssignees,
    label: `Assign`,
    ...(!canChangeAssignees && {
      title: cannotChangeAssigneesMessage(state?.title)
    }),
    dialog: isDialogOpen && {
      type: 'popover',
      onClose: () => {
        setDialogOpen(false)
      },
      content: (
        <UserAssignment assignees={metadata.assignees} documentId={id} locale={metadata.locale} />
      )
    },
    onHandle: () => {
      setDialogOpen(true)
    }
  }
}
