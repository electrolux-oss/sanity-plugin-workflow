import { memo, useCallback, useMemo } from 'react'
import { useCurrentUser, UserAvatar, useSchema } from 'sanity'

import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle'
import { EarthAmericasIcon } from '@sanity/icons/EarthAmericas'
import { ResetIcon } from '@sanity/icons/Reset'
import { RestoreIcon } from '@sanity/icons/Restore'
import { UserIcon } from '@sanity/icons/User'
import { Button, Card, Flex } from '@sanity/ui'
import { Menu, MenuButton } from '@sanity/ui/menu'

import MultiSelectMenu from './MultiSelectMenu'
import UserSelectMenu from './UserSelectMenu'

import type { CurrentUser, Schema as SchemaRegistry } from 'sanity'

import type { MultiSelectAction } from './MultiSelectMenu'

import type { UserExtended } from '../hooks/useUsers'

import type { FilterOptions } from '../types'

const languageNames = new Intl.DisplayNames('en', { type: 'language' })

type FiltersProps = {
  uniqueAssignedUsers: UserExtended[]
  selectedLocales: FilterOptions['locales']
  selectedUserIds: string[]
  schemaTypes: string[]
  selectedSchemaTypes: string[]
  userLocales?: FilterOptions['locales'] | undefined
  toggleSelectedUser: (userId: string) => void
  resetSelectedUsers: () => void
  toggleSelectedSchemaType: (schemaType: string) => void
  setSelectedLocales: (locales: FilterOptions['locales']) => void
}

const UserFilterButton = memo(function UserFilterButton({
  selectedUserIds,
  onAddUserToFilter,
  onRemoveUserFromFilter,
  onClearUserFilter,
  uniqueAssignedUsers
}: {
  selectedUserIds: string[]
  onAddUserToFilter: (id: string) => void
  onRemoveUserFromFilter: (id: string) => void
  onClearUserFilter: () => void
  uniqueAssignedUsers: UserExtended[]
}) {
  return (
    <Card tone="default">
      <MenuButton
        button={
          <Button padding={3} fontSize={1} text="Filter Assignees" tone="primary" icon={UserIcon} />
        }
        id="user-filters"
        popover={{ portal: true, placement: 'top' }}
        menu={
          <Menu padding={0}>
            <UserSelectMenu
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
})

const SlimUserFilterButton = memo(function SlimUserFilterButton({
  meInUniqueAssignees,
  currentUser,
  uniqueAssigneesNotMe,
  selectedUserIds,
  toggleSelectedUser,
  resetSelectedUsers
}: {
  meInUniqueAssignees: UserExtended | undefined
  currentUser: CurrentUser | null
  uniqueAssigneesNotMe: UserExtended[]
  selectedUserIds: string[]
  toggleSelectedUser: (userId: string) => void
  resetSelectedUsers: () => void
}) {
  return (
    <Card tone="inherit">
      <Flex gap={2}>
        {meInUniqueAssignees && currentUser && (
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
})

const LocaleFilterButton = memo(function LocaleFilterButton({
  userLocales,
  selectedLocales,
  setSelectedLocales,
  localeFilterDisabled
}: {
  userLocales: FilterOptions['locales']
  selectedLocales: FilterOptions['locales']
  setSelectedLocales: (locales: FilterOptions['locales']) => void
  localeFilterDisabled: boolean
}) {
  const options = useMemo(
    () =>
      userLocales
        .map(locale => ({
          id: locale,
          label: languageNames.of(locale) ?? locale,
          keywords: [locale]
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [userLocales]
  )

  const actions: MultiSelectAction[] = [
    {
      tone: 'positive',
      icon: CheckmarkCircleIcon,
      text: 'Select all',
      disabled: userLocales.every(locale => selectedLocales.includes(locale)),
      onClick: () => setSelectedLocales(userLocales)
    },
    {
      tone: 'critical',
      icon: RestoreIcon,
      text: 'Clear',
      disabled: selectedLocales.length === 0,
      onClick: () => setSelectedLocales([])
    }
  ]

  return (
    <Card tone="default">
      <MenuButton
        button={
          <Button
            padding={3}
            fontSize={1}
            text={`Languages (${selectedLocales.length})`}
            tone="primary"
            icon={EarthAmericasIcon}
            disabled={localeFilterDisabled}
          />
        }
        popover={{ portal: true, placement: 'top', animate: true }}
        id="locale-filters"
        menu={
          <Menu padding={0}>
            <MultiSelectMenu
              options={options}
              value={selectedLocales}
              onAdd={locale => setSelectedLocales([...selectedLocales, locale])}
              onRemove={locale => setSelectedLocales(selectedLocales.filter(l => l !== locale))}
              actions={actions}
              searchPlaceholder="Search languages"
              notFound="No languages found"
            />
          </Menu>
        }
      />
    </Card>
  )
})

const SchemaTypeButtons = memo(function SchemaTypeButtons({
  schemaTypes,
  selectedSchemaTypes,
  toggleSelectedSchemaType,
  schema
}: {
  schemaTypes: string[]
  selectedSchemaTypes: string[]
  toggleSelectedSchemaType: (schemaType: string) => void
  schema: SchemaRegistry
}) {
  return (
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
  )
})

function Filters(props: FiltersProps) {
  const {
    uniqueAssignedUsers = [],
    selectedLocales,
    selectedUserIds,
    schemaTypes,
    selectedSchemaTypes,
    toggleSelectedUser,
    resetSelectedUsers,
    toggleSelectedSchemaType,
    setSelectedLocales,
    userLocales
  } = props

  const currentUser = useCurrentUser()
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

  const meInUniqueAssignees = useMemo(
    () => uniqueAssignedUsers.find(u => u.id === currentUser?.id),
    [currentUser?.id, uniqueAssignedUsers]
  )

  const uniqueAssigneesNotMe = useMemo(
    () => uniqueAssignedUsers.filter(u => u.id !== currentUser?.id),
    [uniqueAssignedUsers, currentUser?.id]
  )

  const shouldDisplayUserFilter = uniqueAssignedUsers.length > 5

  const localeFilterDisabled = Boolean(userLocales && userLocales.length < 2)

  return (
    <Card tone="primary" padding={2} borderBottom style={{ overflowX: 'hidden' }}>
      <Flex align="center">
        <Flex align="center" gap={4} flex={1}>
          {shouldDisplayUserFilter && (
            <UserFilterButton
              selectedUserIds={selectedUserIds}
              onAddUserToFilter={onAddUserToFilter}
              onRemoveUserFromFilter={onRemoveUserFromFilter}
              onClearUserFilter={onClearUserFilter}
              uniqueAssignedUsers={uniqueAssignedUsers}
            />
          )}
          {!shouldDisplayUserFilter && (
            <SlimUserFilterButton
              meInUniqueAssignees={meInUniqueAssignees}
              currentUser={currentUser}
              uniqueAssigneesNotMe={uniqueAssigneesNotMe}
              selectedUserIds={selectedUserIds}
              toggleSelectedUser={toggleSelectedUser}
              resetSelectedUsers={resetSelectedUsers}
            />
          )}
          {userLocales && (
            <LocaleFilterButton
              userLocales={userLocales}
              selectedLocales={selectedLocales}
              setSelectedLocales={setSelectedLocales}
              localeFilterDisabled={localeFilterDisabled}
            />
          )}
        </Flex>

        {schemaTypes.length > 1 && (
          <SchemaTypeButtons
            schemaTypes={schemaTypes}
            selectedSchemaTypes={selectedSchemaTypes}
            toggleSelectedSchemaType={toggleSelectedSchemaType}
            schema={schema}
          />
        )}
      </Flex>
    </Card>
  )
}

export default memo(Filters)
