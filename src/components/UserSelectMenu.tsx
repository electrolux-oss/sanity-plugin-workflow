import { AddCircleIcon } from '@sanity/icons/AddCircle'
import { RemoveCircleIcon } from '@sanity/icons/RemoveCircle'
import { RestoreIcon } from '@sanity/icons/Restore'
import { useMemo } from 'react'
import { UserAvatar } from 'sanity'

import type { UserExtended } from '../hooks/useUsers'
import MultiSelectMenu from './MultiSelectMenu'
import type { MultiSelectAction, MultiSelectOption } from './MultiSelectMenu'

const LABELS = {
  addMe: 'Assign myself',
  removeMe: 'Unassign myself',
  clear: 'Clear assignees',
  searchPlaceholder: 'Search users',
  notFound: 'No users found'
}

type UserSelectMenuProps = {
  value: string[]
  userList: UserExtended[]
  onAdd: (userId: string) => void
  onRemove: (userId: string) => void
  onClear: () => void
  labels?: Partial<typeof LABELS>
}

export default function UserSelectMenu(props: UserSelectMenuProps) {
  const { value, userList, onAdd, onRemove, onClear } = props
  const labels = { ...LABELS, ...props.labels }

  const options = useMemo(
    (): MultiSelectOption[] =>
      userList
        .filter(user => !user.isCurrentUser)
        .map(user => ({
          id: user.id,
          label: user.displayName,
          keywords: [user.givenName, user.middleName, user.familyName, user.email],
          media: <UserAvatar user={user} size={1} />
        })),
    [userList]
  )

  const me = userList.find(user => user.isCurrentUser)
  const meSelected = Boolean(me && value.includes(me.id))
  const actions: MultiSelectAction[] = [
    meSelected
      ? {
          tone: 'caution',
          icon: RemoveCircleIcon,
          text: labels.removeMe,
          onClick: () => me && onRemove(me.id)
        }
      : {
          tone: 'positive',
          icon: AddCircleIcon,
          text: labels.addMe,
          disabled: !me,
          onClick: () => me && onAdd(me.id)
        },
    {
      tone: 'critical',
      icon: RestoreIcon,
      text: labels.clear,
      disabled: value.length === 0,
      onClick: onClear
    }
  ]

  return (
    <MultiSelectMenu
      options={options}
      value={value}
      onAdd={onAdd}
      onRemove={onRemove}
      actions={actions}
      searchPlaceholder={labels.searchPlaceholder}
      notFound={labels.notFound}
    />
  )
}
