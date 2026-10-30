import { useState } from 'react'

import { UsersIcon } from '@sanity/icons/Users'

import UserAssignment from '../components/UserAssignment'
import { useWorkflowContext } from '../components/WorkflowContext'

import type { DocumentActionProps, DocumentActionDescription } from 'sanity'

export function useAssignWorkflow({ id }: DocumentActionProps): DocumentActionDescription | null {
  const { metadata, loading, error } = useWorkflowContext(id)
  const [isDialogOpen, setDialogOpen] = useState(false)

  if (!metadata) {
    return null
  }

  return {
    icon: UsersIcon,
    disabled: loading || Boolean(error),
    label: `Assign`,
    dialog: isDialogOpen && {
      type: 'dialog',
      header: 'Assign users',
      width: 'small',
      onClose: () => {
        setDialogOpen(false)
      },
      content: (
        <UserAssignment
          assignees={metadata.assignees}
          documentId={id}
          locale={metadata.locale}
          menuWidth="100%"
        />
      )
    },
    onHandle: () => {
      setDialogOpen(true)
    }
  }
}
