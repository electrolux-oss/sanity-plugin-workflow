import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { UserAvatar } from 'sanity'

import { AddCircleIcon } from '@sanity/icons/AddCircle'
import { CheckmarkIcon } from '@sanity/icons/Checkmark'
import { RemoveCircleIcon } from '@sanity/icons/RemoveCircle'
import { RestoreIcon } from '@sanity/icons/Restore'
import { Badge, Box, Button, Card, Flex, Stack, Text, TextInput } from '@sanity/ui'

import { searchUsers } from '../helpers/users'

import type { KeyboardEvent } from 'react'

import type { UserExtended } from '../hooks/useUsers'

const LABELS = {
  addMe: 'Assign myself',
  removeMe: 'Unassign myself',
  clear: 'Clear assignees',
  searchPlaceholder: 'Search users',
  notFound: 'No users found'
}

const MENU_WIDTH = 320
const ACTION_BUTTON_PROPS = {
  mode: 'bleed',
  justify: 'flex-start',
  fontSize: 1,
  padding: 3
} as const
const USER_LIST_MAX_HEIGHT = 360

/** Moves focus between the search field and the enabled buttons with the arrow keys. */
function handleArrowKeys(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
    return
  }

  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('input, button:not([disabled])')
  )
  const current = focusable.indexOf(document.activeElement as HTMLElement)
  const next = focusable[event.key === 'ArrowDown' ? current + 1 : current - 1]

  if (next) {
    event.preventDefault()
    event.stopPropagation()
    next.focus()
  }
}

type UserSelectMenuProps = {
  value: string[]
  userList: UserExtended[]
  onAdd: (userId: string) => void
  onRemove: (userId: string) => void
  onClear: () => void
  labels?: Partial<typeof LABELS>
}

/**
 * Built from plain buttons rather than MenuItems: a Menu focuses whichever item is hovered,
 * which scrolls the list as the pointer moves and pulls focus out of the search field. User
 * rows reuse the Menu's colours instead: pressed when assigned, selected while hovered or
 * focused.
 */
export default function UserSelectMenu(props: UserSelectMenuProps) {
  const { value, userList, onAdd, onRemove, onClear } = props
  const labels = { ...LABELS, ...props.labels }
  const [query, setQuery] = useState('')
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Focus once the popover has been laid out; autoFocus fires before that and is lost
  useEffect(() => {
    const frame = requestAnimationFrame(() => searchRef.current?.focus())

    return () => cancelAnimationFrame(frame)
  }, [])

  const me = userList.find(user => user.isCurrentUser)
  const meSelected = Boolean(me && value.includes(me.id))
  const meAction = meSelected
    ? ({
        tone: 'caution',
        icon: RemoveCircleIcon,
        text: labels.removeMe,
        onClick: onRemove
      } as const)
    : ({ tone: 'positive', icon: AddCircleIcon, text: labels.addMe, onClick: onAdd } as const)
  const results = useMemo(() => searchUsers(userList, query), [userList, query])

  // Hold the height of the unfiltered list while searching: a popover that shrinks with its
  // results gets repositioned by the Studio, which moves it beside the button and drops focus
  const listRef = useRef<HTMLDivElement>(null)
  const [listHeight, setListHeight] = useState<number>()

  useLayoutEffect(() => {
    if (!query && listRef.current) {
      setListHeight(listRef.current.scrollHeight)
    }
  }, [query, userList])

  return (
    <Stack padding={1} gap={1} style={{ width: MENU_WIDTH }} onKeyDown={handleArrowKeys}>
      <Button
        {...ACTION_BUTTON_PROPS}
        tone={meAction.tone}
        icon={meAction.icon}
        text={meAction.text}
        disabled={!me}
        onClick={() => me && meAction.onClick(me.id)}
      />
      <Button
        {...ACTION_BUTTON_PROPS}
        tone="critical"
        icon={RestoreIcon}
        text={labels.clear}
        disabled={value.length === 0}
        onClick={onClear}
      />
      <Box padding={1}>
        <TextInput
          ref={searchRef}
          value={query}
          placeholder={labels.searchPlaceholder}
          onChange={event => setQuery(event.currentTarget.value)}
        />
      </Box>
      <Box
        ref={listRef}
        style={{ height: listHeight, maxHeight: USER_LIST_MAX_HEIGHT, overflowY: 'auto' }}
      >
        <Stack gap={1}>
          {results.length === 0 && (
            <Box padding={3}>
              <Text size={1} muted>
                {labels.notFound}
              </Text>
            </Box>
          )}
          {results.map(user => {
            const selected = value.includes(user.id)

            return (
              <Card
                key={user.id}
                as="button"
                radius={2}
                padding={3}
                pressed={selected}
                selected={activeUserId === user.id}
                onMouseEnter={() => setActiveUserId(user.id)}
                onMouseLeave={() => setActiveUserId(null)}
                onFocus={() => setActiveUserId(user.id)}
                onBlur={() => setActiveUserId(null)}
                onClick={() => (selected ? onRemove(user.id) : onAdd(user.id))}
              >
                <Flex align="center">
                  <UserAvatar user={user} size={1} />
                  <Box paddingX={2} flex={1} style={{ minWidth: 0 }}>
                    <Text size={1} textOverflow="ellipsis">
                      {user.displayName}
                    </Text>
                  </Box>
                  {user.isCurrentUser && (
                    <Badge fontSize={1} tone="positive">
                      Me
                    </Badge>
                  )}
                  {selected && (
                    <Box paddingLeft={2}>
                      <Text size={1}>
                        <CheckmarkIcon />
                      </Text>
                    </Box>
                  )}
                </Flex>
              </Card>
            )
          })}
        </Stack>
      </Box>
    </Stack>
  )
}
