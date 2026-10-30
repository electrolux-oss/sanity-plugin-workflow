import { Box, Text } from '@sanity/ui'
import { Tooltip } from '@sanity/ui/tooltip'

import type { ReactNode } from 'react'

type ButtonTooltipProps = {
  text: string
  disabled?: boolean
  children: ReactNode
}

/**
 * A tooltip for a button that may be disabled. A disabled button gets no hover events, so the
 * tooltip listens on a wrapper; give a disabled button `pointerEvents: 'none'` so the pointer
 * reaches it.
 */
export default function ButtonTooltip({ text, disabled = false, children }: ButtonTooltipProps) {
  return (
    <Tooltip
      portal
      disabled={disabled}
      content={
        <Box padding={2}>
          <Text size={1}>{text}</Text>
        </Box>
      }
    >
      <Box>{children}</Box>
    </Tooltip>
  )
}
