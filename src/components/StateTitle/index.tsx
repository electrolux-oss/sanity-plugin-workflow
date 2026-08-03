import { styled } from 'styled-components'

import { InfoOutlineIcon } from '@sanity/icons/InfoOutline'
import { UserIcon } from '@sanity/icons/User'
import { Badge, Box, Card, Flex, Text } from '@sanity/ui'

import { Status } from './Status'

import type { BadgeTone } from '@sanity/ui'
import type { State } from '../../types'

const StyledStickyCard = styled(Card)`
  position: sticky;
  top: 0;
  z-index: 1;
`

type StateTitleProps = {
  state: State
  requireAssignment: boolean
  userRoleCanDrop: boolean
  isDropDisabled: boolean
  draggingFrom: string
  documentCount: number
}

export default function StateTitle(props: StateTitleProps) {
  const { state, requireAssignment, userRoleCanDrop, isDropDisabled, draggingFrom, documentCount } =
    props

  let tone: BadgeTone = 'default'
  const isSource = draggingFrom === state.id

  if (draggingFrom) {
    tone = isDropDisabled || isSource ? 'default' : 'positive'
  }

  return (
    <StyledStickyCard paddingY={4} padding={3} tone="inherit">
      <Flex gap={3} align="center">
        <Badge tone={tone} style={{ opacity: !userRoleCanDrop || isDropDisabled ? 0.5 : 1 }}>
          {state.title}
        </Badge>
        {userRoleCanDrop ? null : (
          <Status
            text="You do not have permissions to move documents to this State"
            icon={InfoOutlineIcon}
          />
        )}
        {requireAssignment ? (
          <Status
            text="You must be assigned to the document to move documents to this State"
            icon={UserIcon}
          />
        ) : null}
        <Box flex={1}>
          {documentCount > 0 ? (
            <Text weight="semibold" align="right" size={1}>
              {documentCount}
            </Text>
          ) : null}
        </Box>
      </Flex>
    </StyledStickyCard>
  )
}
