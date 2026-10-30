import { memo, useCallback, useMemo } from 'react'
import { UserAvatar, useSchema } from 'sanity'

import { EarthAmericasIcon } from '@sanity/icons/EarthAmericas'
import { RestoreIcon } from '@sanity/icons/Restore'
import { UserIcon } from '@sanity/icons/User'
import { AvatarStack, Button, Flex } from '@sanity/ui'
import { Menu, MenuButton } from '@sanity/ui/menu'

import { getLanguageTitle } from '../helpers/localeFilter'
import FilterBarButtonContent, { FILTER_BAR_BUTTON_PADDING } from './FilterBarButtonContent'
import MultiSelectMenu from './MultiSelectMenu'
import UserSelectMenu from './UserSelectMenu'

import type { Schema as SchemaRegistry } from 'sanity'

import type { MultiSelectAction } from './MultiSelectMenu'

import type { UserExtended } from '../hooks/useUsers'

import type { FilterOptions, Language } from '../types'

type FiltersProps = {
  uniqueAssignedUsers: UserExtended[]
  selectedLocales: FilterOptions['locales']
  selectedUserIds: string[]
  schemaTypes: string[]
  selectedSchemaTypes: string[]
  userLocales?: FilterOptions['locales'] | undefined
  languages: Language[]
  toggleSelectedUser: (userId: string) => void
  resetSelectedUsers: () => void
  toggleSelectedSchemaType: (schemaType: string) => void
  setSelectedLocales: (locales: FilterOptions['locales']) => void
}

const AssigneeFilterButton = memo(function AssigneeFilterButton({
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
  const selectedUsers = uniqueAssignedUsers.filter(user => selectedUserIds.includes(user.id))

  return (
    <MenuButton
      button={
        <Button
          {...FILTER_BAR_BUTTON_PADDING}
          mode="ghost"
          disabled={uniqueAssignedUsers.length === 0 && selectedUserIds.length === 0}
        >
          <FilterBarButtonContent
            text="Assignees"
            icon={UserIcon}
            media={
              selectedUsers.length > 0 && (
                <AvatarStack maxLength={3} size={0}>
                  {selectedUsers.map(user => (
                    <UserAvatar key={user.id} user={user} size={0} />
                  ))}
                </AvatarStack>
              )
            }
            dropdown
          />
        </Button>
      }
      id="user-filters"
      popover={{ portal: true, placement: 'bottom-start' }}
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
  )
})

const LocaleFilterButton = memo(function LocaleFilterButton({
  userLocales,
  languages,
  selectedLocales,
  setSelectedLocales,
  localeFilterDisabled
}: {
  userLocales: FilterOptions['locales']
  languages: Language[]
  selectedLocales: FilterOptions['locales']
  setSelectedLocales: (locales: FilterOptions['locales']) => void
  localeFilterDisabled: boolean
}) {
  const options = useMemo(
    () =>
      userLocales
        .map(locale => ({
          id: locale,
          label: getLanguageTitle(locale, languages),
          keywords: [locale]
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [userLocales, languages]
  )

  const actions: MultiSelectAction[] = [
    {
      tone: 'critical',
      icon: RestoreIcon,
      text: 'Clear',
      disabled: selectedLocales.length === 0,
      onClick: () => setSelectedLocales([])
    }
  ]

  return (
    <MenuButton
      button={
        <Button {...FILTER_BAR_BUTTON_PADDING} mode="ghost" disabled={localeFilterDisabled}>
          <FilterBarButtonContent
            text={
              selectedLocales.length > 0 ? `Languages (${selectedLocales.length})` : 'Languages'
            }
            icon={EarthAmericasIcon}
            dropdown
          />
        </Button>
      }
      popover={{ portal: true, placement: 'bottom-start', animate: true }}
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
            key={typeName}
            {...FILTER_BAR_BUTTON_PADDING}
            mode={selectedSchemaTypes.includes(typeName) ? `default` : `ghost`}
            onClick={() => toggleSelectedSchemaType(typeName)}
          >
            <FilterBarButtonContent text={schemaType.title ?? typeName} icon={schemaType.icon} />
          </Button>
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
    userLocales,
    languages
  } = props

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

  const localeFilterDisabled = Boolean(userLocales && userLocales.length < 2)

  return (
    <Flex align="center" flex={1}>
      <Flex align="center" gap={4} flex={1}>
        <AssigneeFilterButton
          selectedUserIds={selectedUserIds}
          onAddUserToFilter={onAddUserToFilter}
          onRemoveUserFromFilter={onRemoveUserFromFilter}
          onClearUserFilter={onClearUserFilter}
          uniqueAssignedUsers={uniqueAssignedUsers}
        />
        {userLocales && (
          <LocaleFilterButton
            userLocales={userLocales}
            languages={languages}
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
  )
}

export default memo(Filters)
