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
}

export default function UserAssignment(props: UserAssignmentProps) {
  const { documentId, locale } = props
  const assignees = props.assignees ?? NO_ASSIGNEES
  const userList = useAssignableUsers(locale, assignees)
  const [selected, setSelected] = React.useState(assignees)

  // Show changes straight away instead of waiting for the listener to echo the patch back
  React.useEffect(() => {
    setSelected(assignees)
  }, [assignees])
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
    async (userId: string) => {
      const user = findUser(userId)

      if (!user) {
        return
      }

      setSelected(current => [...current, userId])

      const added = await runWithToast(
        toast,
        () =>
          client
            .patch(metadataId)
            .setIfMissing({ assignees: [] })
            .insert(`after`, `assignees[-1]`, [userId])
            .commit(),
        { success: `Added ${user.displayName} to assignees`, error: 'Failed to add assignee' }
      )

      if (!added) {
        setSelected(current => current.filter(id => id !== userId))
      }
    },
    [client, toast, metadataId, findUser]
  )

  const removeAssignee = React.useCallback(
    async (userId: string) => {
      const user = findUser(userId)

      if (!user) {
        return
      }

      setSelected(current => current.filter(id => id !== userId))

      const removed = await runWithToast(
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

      if (!removed) {
        setSelected(current => [...current, userId])
      }
    },
    [client, toast, metadataId, findUser]
  )

  const clearAssignees = React.useCallback(async () => {
    const previous = selected
    setSelected(NO_ASSIGNEES)

    const cleared = await runWithToast(
      toast,
      () => client.patch(metadataId).unset([`assignees`]).commit(),
      { success: 'Cleared assignees', error: 'Failed to clear assignees' }
    )

    if (!cleared) {
      setSelected(previous)
    }
  }, [client, toast, metadataId, selected])

  return (
    <UserSelectMenu
      value={selected}
      userList={userList}
      onAdd={addAssignee}
      onClear={clearAssignees}
      onRemove={removeAssignee}
    />
  )
}
