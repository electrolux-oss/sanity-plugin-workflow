import type { DocumentActionProps, DocumentActionDescription } from 'sanity'
import { useState } from 'react'

import { UsersIcon } from '@sanity/icons'

import UserAssignment from '../components/UserAssignment'
import { useWorkflowContext } from '../components/WorkflowContext'
import { API_VERSION } from '../constants'
import { useProjectUsers } from '../hooks/useUsers'

export function useAssignWorkflow({ id }: DocumentActionProps): DocumentActionDescription | null {
  const { metadata, loading, error } = useWorkflowContext(id)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const userList = useProjectUsers({ apiVersion: API_VERSION })

  if (error) {
    console.error(error)
  }

  if (!metadata) {
    return null
  }

  return {
    icon: UsersIcon,
    disabled: !metadata || loading || Boolean(error),
    label: `Assign`,
    title: metadata ? null : `Document is not in Workflow`,
    dialog: isDialogOpen && {
      type: 'popover',
      onClose: () => {
        setDialogOpen(false)
      },
      content: (
        // <div>Testing</div>
        <UserAssignment
          userList={userList}
          assignees={metadata?.assignees?.length > 0 ? metadata.assignees : []}
          documentId={id}
        />
      )
    },
    onHandle: () => {
      setDialogOpen(true)
    }
  }
}
