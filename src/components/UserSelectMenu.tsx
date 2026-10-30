import { useMemo, useState } from 'react'
import { UserAvatar } from 'sanity'

import { AddCircleIcon } from '@sanity/icons/AddCircle'
import { RemoveCircleIcon } from '@sanity/icons/RemoveCircle'
import { RestoreIcon } from '@sanity/icons/Restore'
import { Badge, Box, Flex, Stack, Text, TextInput } from '@sanity/ui'
import { Menu, MenuItem } from '@sanity/ui/menu'

import { searchUsers } from '../helpers/users'

import type { UserExtended } from '../hooks/useUsers'

const LABELS = {
  addMe: 'Assign myself',
  removeMe: 'Unassign myself',
  clear: 'Clear assignees',
  searchPlaceholder: 'Search users',
  notFound: 'No users found'
}

const MENU_WIDTH = 320
const USER_LIST_MAX_HEIGHT = 360

type UserSelectMenuProps = {
  value: string[]
  userList: UserExtended[]
  onAdd: (userId: string) => void
  onRemove: (userId: string) => void
  onClear: () => void
  labels?: Partial<typeof LABELS>
  width?: number | string
}

export default function UserSelectMenu(props: UserSelectMenuProps) {
  const { value, userList, onAdd, onRemove, onClear, width = MENU_WIDTH } = props
  const labels = { ...LABELS, ...props.labels }
  const [query, setQuery] = useState('')

  const me = userList.find(user => user.isCurrentUser)
  const meSelected = Boolean(me && value.includes(me.id))
  const results = useMemo(() => searchUsers(userList, query), [userList, query])

  return (
    <Menu style={{ width }}>
      {meSelected ? (
        <MenuItem
          tone="caution"
          icon={RemoveCircleIcon}
          text={labels.removeMe}
          onClick={() => me && onRemove(me.id)}
        />
      ) : (
        <MenuItem
          tone="positive"
          icon={AddCircleIcon}
          text={labels.addMe}
          disabled={!me}
          onClick={() => me && onAdd(me.id)}
        />
      )}
      <MenuItem
        tone="critical"
        icon={RestoreIcon}
        text={labels.clear}
        disabled={value.length === 0}
        onClick={onClear}
      />
      <Box padding={1}>
        <TextInput
          autoFocus
          value={query}
          placeholder={labels.searchPlaceholder}
          onChange={event => setQuery(event.currentTarget.value)}
        />
      </Box>
      <Box style={{ maxHeight: USER_LIST_MAX_HEIGHT, overflowY: 'auto' }}>
        <Stack gap={1}>
          {results.length === 0 ? <MenuItem disabled text={labels.notFound} /> : null}
          {results.map(user => {
            const selected = value.includes(user.id)

            return (
              <MenuItem
                key={user.id}
                pressed={selected}
                onClick={() => (selected ? onRemove(user.id) : onAdd(user.id))}
              >
                <Flex align="center">
                  <UserAvatar user={user} size={1} />
                  <Box paddingX={2} flex={1} style={{ minWidth: 0 }}>
                    <Text textOverflow="ellipsis">{user.displayName}</Text>
                  </Box>
                  {user.isCurrentUser ? (
                    <Badge fontSize={1} tone="positive">
                      Me
                    </Badge>
                  ) : null}
                </Flex>
              </MenuItem>
            )
          })}
        </Stack>
      </Box>
    </Menu>
  )
}
