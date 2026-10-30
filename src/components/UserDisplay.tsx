import { useCallback, useMemo, useState } from 'react'

import { AddIcon } from '@sanity/icons/Add'
import { Button, Grid, useClickOutsideEvent } from '@sanity/ui'
import { Popover } from '@sanity/ui/popover'

import AvatarGroup from './DocumentCard/AvatarGroup'
import UserAssignment from './UserAssignment'

import type { UserExtended } from '../hooks/useUsers'

type UserDisplayProps = {
  userList: UserExtended[]
  assignees: string[] | null
  documentId: string
  locale: string | null
}

export default function UserDisplay(props: UserDisplayProps) {
  const { assignees, userList, documentId, locale } = props

  const [button, setButton] = useState<HTMLButtonElement | null>(null)
  const [popover, setPopover] = useState<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(current => !current), [])

  useClickOutsideEvent(isOpen && close, () => [button, popover])

  const assignedUsers = useMemo(
    () => (assignees?.length ? userList.filter(u => assignees.includes(u.id)) : []),
    [userList, assignees]
  )

  return (
    <Popover
      ref={setPopover}
      content={
        isOpen && <UserAssignment assignees={assignees} documentId={documentId} locale={locale} />
      }
      portal
      open={isOpen}
      placement="right"
      fallbackPlacements={['left-start']}
    >
      {!assignees || assignees.length === 0 ? (
        <Button
          ref={setButton}
          onClick={toggle}
          fontSize={1}
          padding={2}
          tabIndex={-1}
          icon={AddIcon}
          text="Assign"
          tone="positive"
          mode="ghost"
        />
      ) : (
        <Grid>
          <Button ref={setButton} onClick={toggle} padding={0} mode="bleed">
            <AvatarGroup users={assignedUsers} />
          </Button>
        </Grid>
      )}
    </Popover>
  )
}
