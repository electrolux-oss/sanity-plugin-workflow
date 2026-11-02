import React from 'react'
import { useCurrentUser, UserAvatar } from 'sanity'

import { Box, Flex, Text } from '@sanity/ui'

import type { User } from 'sanity'

type AvatarGroupProps = {
  users: User[]
  max?: number
}

export default function AvatarGroup(props: AvatarGroupProps) {
  const currentUser = useCurrentUser()
  const { users, max = 4 } = props

  const { me, visibleUsers, hiddenCount } = React.useMemo(() => {
    const currentUserInList = users.find(u => u.id === currentUser?.id)
    const others = users.filter(u => u.id !== currentUser?.id)
    const visibleOthers = others.slice(0, currentUserInList ? max - 1 : max)

    return {
      me: currentUserInList,
      visibleUsers: visibleOthers,
      hiddenCount: others.length - visibleOthers.length
    }
  }, [users, max, currentUser?.id])

  if (!users?.length) {
    return null
  }

  return (
    <Flex align="center" gap={1}>
      {me && <UserAvatar user={me} />}
      {visibleUsers.map(user => (
        <Box key={user.id} style={{ marginRight: -8 }}>
          <UserAvatar user={user} />
        </Box>
      ))}
      {hiddenCount > 0 && (
        <Box paddingLeft={2}>
          <Text size={1}>+{hiddenCount}</Text>
        </Box>
      )}
    </Flex>
  )
}
