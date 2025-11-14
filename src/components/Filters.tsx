import { useCallback, useMemo } from 'react'
import { useCurrentUser, UserAvatar, useSchema } from 'sanity'
import { UserSelectMenu } from 'sanity-plugin-utils'

import {
  CheckmarkCircleIcon,
  CircleIcon,
  EarthAmericasIcon,
  ResetIcon,
  UserIcon
} from '@sanity/icons'
import { Button, Card, Flex, Menu, MenuButton, MenuItem } from '@sanity/ui'

import type { UserExtended } from 'sanity-plugin-utils'

import type { FilterOptions } from '../types'

type FiltersProps = {
  uniqueAssignedUsers: UserExtended[]
  selectedLocales: FilterOptions['locales']
  selectedUserIds: string[]
  schemaTypes: string[]
  selectedSchemaTypes: string[]
  userLocales?: FilterOptions['locales']
  toggleSelectedUser: (userId: string) => void
  resetSelectedUsers: () => void
  toggleSelectedSchemaType: (schemaType: string) => void
  toggleLocales: (locales: FilterOptions['locales']) => void
}

export default function Filters(props: FiltersProps) {
  const {
    uniqueAssignedUsers = [],
    selectedLocales,
    selectedUserIds,
    schemaTypes,
    selectedSchemaTypes,
    toggleSelectedUser,
    resetSelectedUsers,
    toggleSelectedSchemaType,
    toggleLocales,
    userLocales
  } = props

  const memoizedCurrentUser = useCurrentUser()

  const currentUser = useMemo(() => memoizedCurrentUser, [memoizedCurrentUser])
  const schema = useSchema()

  const onAddUserToFilter = useCallback(
    (id: string) => {
      if (!selectedUserIds.includes(id)) {
        toggleSelectedUser(id)
      }
    },
    [selectedUserIds, toggleSelectedUser]
  )

  const onRemoveUserFromFilter = useCallback(
    (id: string) => {
      if (selectedUserIds.includes(id)) {
        toggleSelectedUser(id)
      }
    },
    [selectedUserIds, toggleSelectedUser]
  )

  const onClearUserFilter = useCallback(() => {
    resetSelectedUsers()
  }, [resetSelectedUsers])

  const meInUniqueAssignees =
    currentUser?.id && uniqueAssignedUsers.find(u => u.id === currentUser.id)

  const uniqueAssigneesNotMe = uniqueAssignedUsers.filter(u => u.id !== currentUser?.id)

  const shouldDisplayUserFilter = uniqueAssignedUsers.length > 5

  const localeFilterDisabled = userLocales && userLocales.length < 2

  const sortedLocales = userLocales?.sort((a, b) => {
    const aSelected = selectedLocales.includes(a) ? -1 : 1
    const bSelected = selectedLocales.includes(b) ? -1 : 1
    return aSelected - bSelected
  })

  const UserFilter = () => (
    <Card tone="default">
      <MenuButton
        button={
          <Button padding={3} fontSize={1} text="Filter Assignees" tone="primary" icon={UserIcon} />
        }
        id="user-filters"
        popover={{ portal: true, placement: 'top' }}
        menu={
          <Menu>
            <UserSelectMenu
              style={{ maxHeight: '70dvh' }}
              value={selectedUserIds}
              userList={uniqueAssignedUsers}
              onAdd={onAddUserToFilter}
              onRemove={onRemoveUserFromFilter}
              onClear={onClearUserFilter}
              labels={{
                addMe: 'Filter mine',
                removeMe: 'Clear mine',
                clear: 'Clear filters'
              }}
            />
          </Menu>
        }
      />
    </Card>
  )

  const SlimUserFilter = () => (
    <Card tone="inherit">
      <Flex gap={2}>
        {meInUniqueAssignees && (
          <>
            <Button
              padding={0}
              mode={selectedUserIds.includes(currentUser.id) ? `default` : `bleed`}
              onClick={() => toggleSelectedUser(currentUser.id)}
            >
              <Flex padding={1} align="center" justify="center">
                <UserAvatar user={currentUser.id} size={1} withTooltip />
              </Flex>
            </Button>
            <Card borderRight style={{ height: 30 }} tone="inherit" />
          </>
        )}

        {uniqueAssigneesNotMe.map(user => (
          <Button
            key={user.id}
            padding={0}
            mode={selectedUserIds.includes(user.id) ? 'default' : 'bleed'}
            tone={selectedUserIds.includes(user.id) ? 'primary' : 'default'}
            onClick={() => toggleSelectedUser(user.id)}
          >
            <Flex padding={1} align="center" justify="center">
              <UserAvatar user={user} size={1} withTooltip />
            </Flex>
          </Button>
        ))}

        {selectedUserIds.length > 0 && (
          <Button
            padding={3}
            fontSize={1}
            text="Clear"
            onClick={resetSelectedUsers}
            mode="ghost"
            tone="critical"
            icon={ResetIcon}
          />
        )}
      </Flex>
    </Card>
  )

  const LocaleFilter = () => (
    <Card tone="default">
      <MenuButton
        button={
          <Button
            padding={3}
            fontSize={1}
            text="Filter Languages"
            tone="primary"
            icon={EarthAmericasIcon}
            disabled={localeFilterDisabled}
          />
        }
        popover={{ portal: true, placement: 'top', animate: true }}
        id="locale-filters"
        menu={
          <Menu style={{ maxHeight: '70dvh' }}>
            <MenuItem
              fontSize={1}
              onClick={() => toggleLocales(userLocales!)}
              disabled={localeFilterDisabled}
              tone="positive"
              padding={3}
              text="Toggle all"
            />
            {sortedLocales?.map((locale, idx) => {
              const selected = selectedLocales.includes(locale)
              return (
                <MenuItem
                  key={idx}
                  text={new Intl.DisplayNames('en', { type: 'language' }).of(locale)}
                  icon={
                    selected ? (
                      <CheckmarkCircleIcon
                        style={{ color: 'var(--card-badge-positive-icon-color)' }}
                      />
                    ) : (
                      CircleIcon
                    )
                  }
                  onClick={() => toggleLocales([locale])}
                />
              )
            })}
          </Menu>
        }
      />
    </Card>
  )

  return (
    <Card tone="primary" padding={2} borderBottom style={{ overflowX: 'hidden' }}>
      <Flex align="center">
        <Flex align="center" gap={4} flex={1}>
          {shouldDisplayUserFilter && <UserFilter />}
          {!shouldDisplayUserFilter && <SlimUserFilter />}
          {userLocales && <LocaleFilter />}
        </Flex>

        {schemaTypes.length > 1 && (
          <Flex align="center" gap={1}>
            {schemaTypes.map(typeName => {
              const schemaType = schema.get(typeName)

              if (!schemaType) {
                return null
              }

              return (
                <Button
                  padding={3}
                  fontSize={1}
                  key={typeName}
                  text={schemaType?.title ?? typeName}
                  icon={schemaType?.icon ?? undefined}
                  mode={selectedSchemaTypes.includes(typeName) ? `default` : `ghost`}
                  onClick={() => toggleSelectedSchemaType(typeName)}
                />
              )
            })}
          </Flex>
        )}
      </Flex>
    </Card>
  )
}
