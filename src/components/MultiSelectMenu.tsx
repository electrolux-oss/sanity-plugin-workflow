import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { CheckmarkIcon } from '@sanity/icons/Checkmark'
import { SearchIcon } from '@sanity/icons/Search'
import { Box, Button, Card, Flex, Stack, Text, TextInput } from '@sanity/ui'

import { searchOptions } from '../helpers/search'

import type { ComponentType, KeyboardEvent, ReactNode } from 'react'

import type { ButtonTone } from '@sanity/ui'

export type MultiSelectOption = {
  id: string
  label: string
  keywords?: (string | undefined)[]
  media?: ReactNode
  badge?: ReactNode
}

export type MultiSelectAction = {
  text: string
  icon: ComponentType
  tone: ButtonTone
  disabled?: boolean
  onClick: () => void
}

const MENU_WIDTH = 320
const LIST_MAX_HEIGHT = 360
const ACTION_BUTTON_PROPS = {
  mode: 'bleed',
  justify: 'flex-start',
  fontSize: 1,
  padding: 3
} as const

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

type MultiSelectMenuProps = {
  options: MultiSelectOption[]
  value: string[]
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  actions: MultiSelectAction[]
  searchPlaceholder: string
  notFound: string
}

/**
 * A searchable multi-select list with fixed actions above it. Built from plain buttons rather
 * than MenuItems: a Menu focuses whichever item is hovered, which scrolls the list as the
 * pointer moves and pulls focus out of the search field. Rows reuse the Menu's colours instead:
 * pressed when chosen, selected while hovered or focused. Clicks on them do not close a
 * surrounding MenuButton, so several options can be picked in one go.
 */
export default function MultiSelectMenu(props: MultiSelectMenuProps) {
  const { options, value, onAdd, onRemove, actions, searchPlaceholder, notFound } = props
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Focus once the popover has been laid out; autoFocus fires before that and is lost
  useEffect(() => {
    const frame = requestAnimationFrame(() => searchRef.current?.focus())

    return () => cancelAnimationFrame(frame)
  }, [])

  const results = useMemo(() => searchOptions(options, query), [options, query])

  // Hold the height of the unfiltered list while searching: a popover that shrinks with its
  // results gets repositioned by the Studio, which moves it beside the button and drops focus
  const listRef = useRef<HTMLDivElement>(null)
  const [listHeight, setListHeight] = useState<number>()

  useLayoutEffect(() => {
    if (!query && listRef.current) {
      setListHeight(listRef.current.scrollHeight)
    }
  }, [query, options])

  return (
    <Stack padding={1} gap={1} style={{ width: MENU_WIDTH }} onKeyDown={handleArrowKeys}>
      {actions.map(action => (
        <Button
          key={action.text}
          {...ACTION_BUTTON_PROPS}
          tone={action.tone}
          icon={action.icon}
          text={action.text}
          disabled={action.disabled}
          onClick={action.onClick}
        />
      ))}
      <Box padding={1}>
        <TextInput
          ref={searchRef}
          icon={SearchIcon}
          fontSize={1}
          value={query}
          placeholder={searchPlaceholder}
          onChange={event => setQuery(event.currentTarget.value)}
        />
      </Box>
      <Box
        ref={listRef}
        style={{ height: listHeight, maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto' }}
      >
        <Stack gap={1}>
          {results.length === 0 && (
            <Box padding={3}>
              <Text size={1} muted>
                {notFound}
              </Text>
            </Box>
          )}
          {results.map(option => {
            const selected = value.includes(option.id)

            return (
              <Card
                key={option.id}
                as="button"
                radius={2}
                padding={3}
                pressed={selected}
                selected={activeId === option.id}
                onMouseEnter={() => setActiveId(option.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(option.id)}
                onBlur={() => setActiveId(null)}
                onClick={() => (selected ? onRemove(option.id) : onAdd(option.id))}
              >
                <Flex align="center" gap={2}>
                  {option.media}
                  <Box flex={1} style={{ minWidth: 0 }}>
                    <Text size={1} textOverflow="ellipsis">
                      {option.label}
                    </Text>
                  </Box>
                  {option.badge}
                  {selected && (
                    <Text size={1}>
                      <CheckmarkIcon />
                    </Text>
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
