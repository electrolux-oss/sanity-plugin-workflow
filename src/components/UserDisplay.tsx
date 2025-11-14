import React from 'react'

import { AddIcon } from '@sanity/icons'
import { Button, Grid, Popover, useClickOutside } from '@sanity/ui'

import AvatarGroup from './DocumentCard/AvatarGroup'
import UserAssignment from './UserAssignment'

import type { User } from '../types'
type UserDisplayProps = {
  userList: User[]
  assignees: string[]
  documentId: string
  disabled?: boolean
}

export default function UserDisplay(props: UserDisplayProps) {
  const { assignees, userList, documentId, disabled = false } = props

  const [button] = React.useState(null)
  const [popover, setPopover] = React.useState(null)
  const [isOpen, setIsOpen] = React.useState(false)

  const close = React.useCallback(() => setIsOpen(false), [])
  const open = React.useCallback(() => setIsOpen(true), [])

  useClickOutside(close, [button, popover])

  return (
    <Popover
      // @ts-ignore
      ref={setPopover}
      content={<UserAssignment userList={userList} assignees={assignees} documentId={documentId} />}
      portal
      open={isOpen}
    >
      {!assignees || assignees.length === 0 ? (
        <Button
          onClick={open}
          fontSize={1}
          padding={2}
          tabIndex={-1}
          icon={AddIcon}
          text="Assign"
          tone="positive"
          mode="ghost"
          disabled={disabled}
        />
      ) : (
        <Grid>
          <Button onClick={open} padding={0} mode="bleed" disabled={disabled}>
            <AvatarGroup users={userList.filter(u => assignees.includes(u.id))} />
          </Button>
        </Grid>
      )}
    </Popover>
  )
}
