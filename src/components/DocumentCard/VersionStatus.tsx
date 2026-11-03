import { Box, Text } from '@sanity/ui'
import { Tooltip } from '@sanity/ui/tooltip'
import type { ComponentType } from 'react'
import { RelativeTime, TextWithTone } from 'sanity'

type VersionStatusProps = {
  updatedAt: string | null | undefined
  icon: ComponentType
  tone: 'caution' | 'positive'
  label: string
  missingLabel: string
}

export function VersionStatus(props: VersionStatusProps) {
  const { updatedAt, icon: Icon, tone, label, missingLabel } = props

  return (
    <Tooltip
      portal
      content={
        <Box padding={2}>
          <Text size={1}>
            {updatedAt ? (
              <>
                {label} <RelativeTime time={updatedAt} />
              </>
            ) : (
              missingLabel
            )}
          </Text>
        </Box>
      }
    >
      <TextWithTone tone={tone} dimmed={!updatedAt} muted={!updatedAt} size={1}>
        <Icon />
      </TextWithTone>
    </Tooltip>
  )
}
