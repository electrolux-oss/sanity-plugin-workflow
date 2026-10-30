import React from 'react'
import { useClient } from 'sanity'

import { useToast } from '@sanity/ui/toast'

import { API_VERSION } from '../constants'
import { runWithToast } from '../helpers/runWithToast'
import { useAssignableUsers } from '../hooks/useUsers'
import UserSelectMenu from './UserSelectMenu'

const NO_ASSIGNEES: string[] = []

type UserAssignmentProps = {
  assignees: string[] | null
  documentId: string
  locale: string | null | undefined
  menuWidth?: number | string
}

export default function UserAssignment(props: UserAssignmentProps) {
  const { documentId, locale, menuWidth } = props
  const assignees = props.assignees ?? NO_ASSIGNEES
  const userList = useAssignableUsers(locale, assignees)
  const client = useClient({ apiVersion: API_VERSION })
  const toast = useToast()

  const metadataId = `workflow-metadata.${documentId}`

  const findUser = React.useCallback(
    (userId: string) => {
      const user = userList.find(u => u.id === userId)

      if (!user) {
        toast.push({ status: 'error', title: 'Could not find User' })
      }

      return user
    },
    [toast, userList]
  )

  const addAssignee = React.useCallback(
    (userId: string) => {
      const user = findUser(userId)

      if (!user) {
        return
      }

      runWithToast(
        toast,
        () =>
          client
            .patch(metadataId)
            .setIfMissing({ assignees: [] })
            .insert(`after`, `assignees[-1]`, [userId])
            .commit(),
        { success: `Added ${user.displayName} to assignees`, error: 'Failed to add assignee' }
      )
    },
    [client, toast, metadataId, findUser]
  )

  const removeAssignee = React.useCallback(
    (userId: string) => {
      const user = findUser(userId)

      if (!user) {
        return
      }

      runWithToast(
        toast,
        () =>
          client
            .patch(metadataId)
            .unset([`assignees[@ == "${userId}"]`])
            .commit(),
        {
          success: `Removed ${user.displayName} from assignees`,
          error: 'Failed to remove assignee'
        }
      )
    },
    [client, toast, metadataId, findUser]
  )

  const clearAssignees = React.useCallback(() => {
    runWithToast(toast, () => client.patch(metadataId).unset([`assignees`]).commit(), {
      success: 'Cleared assignees',
      error: 'Failed to clear assignees'
    })
  }, [client, toast, metadataId])

  return (
    <UserSelectMenu
      value={assignees}
      {...(menuWidth !== undefined && { width: menuWidth })}
      userList={userList}
      onAdd={addAssignee}
      onClear={clearAssignees}
      onRemove={removeAssignee}
    />
  )
}
