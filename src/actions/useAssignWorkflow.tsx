import { useState } from 'react'

import { UsersIcon } from '@sanity/icons/Users'

import UserAssignment from '../components/UserAssignment'
import { useWorkflowContext } from '../components/WorkflowContext'
import { API_VERSION } from '../constants'
import { useProjectUsers } from '../hooks/useUsers'

import type { DocumentActionProps, DocumentActionDescription } from 'sanity'

export function useAssignWorkflow({ id }: DocumentActionProps): DocumentActionDescription | null {
  const { metadata, loading, error } = useWorkflowContext(id)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const userList = useProjectUsers({ apiVersion: API_VERSION })

  if (!metadata) {
    return null
  }

  return {
    icon: UsersIcon,
    disabled: loading || Boolean(error),
    label: `Assign`,
    dialog: isDialogOpen && {
      type: 'popover',
      onClose: () => {
        setDialogOpen(false)
      },
      content: (
        <UserAssignment userList={userList} assignees={metadata.assignees ?? []} documentId={id} />
      )
    },
    onHandle: () => {
      setDialogOpen(true)
    }
  }
}
