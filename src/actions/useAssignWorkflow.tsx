import { useState } from 'react'

import { UsersIcon } from '@sanity/icons/Users'

import UserAssignment from '../components/UserAssignment'
import { useWorkflowContext } from '../components/WorkflowContext'
import { useCanAssignUsers } from '../hooks/useUsers'

import type { DocumentActionProps, DocumentActionDescription } from 'sanity'

export function useAssignWorkflow({ id }: DocumentActionProps): DocumentActionDescription | null {
  const { metadata, loading, error } = useWorkflowContext(id)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const canAssign = useCanAssignUsers(metadata?.state, metadata?.locale)

  if (!metadata) {
    return null
  }

  return {
    icon: UsersIcon,
    disabled: loading || Boolean(error) || !canAssign,
    label: `Assign`,
    ...(!canAssign && { title: 'You cannot assign users to this document' }),
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
