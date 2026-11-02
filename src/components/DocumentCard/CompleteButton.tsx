import { useCallback } from 'react'
import { useClient } from 'sanity'

import { CheckmarkIcon } from '@sanity/icons/Checkmark'
import { Box, Button, Text } from '@sanity/ui'
import { Tooltip } from '@sanity/ui/tooltip'
import { useToast } from '@sanity/ui/toast'

import { completeWorkflow } from '../../actions/useCompleteWorkflow'
import { API_VERSION } from '../../constants'

type CompleteButtonProps = {
  documentId: string
  disabled: boolean
}

export default function CompleteButton(props: CompleteButtonProps) {
  const { documentId, disabled } = props
  const client = useClient({ apiVersion: API_VERSION })
  const toast = useToast()

  const handleComplete = useCallback(
    () => completeWorkflow(client, toast, documentId),
    [client, toast, documentId]
  )

  return (
    <Tooltip
      portal
      content={
        <Box padding={2}>
          <Text size={1}>Ends the workflow for this document.</Text>
        </Box>
      }
    >
      <Button
        onClick={handleComplete}
        text="Complete"
        icon={CheckmarkIcon}
        tone="positive"
        mode="ghost"
        fontSize={1}
        padding={2}
        tabIndex={-1}
        disabled={disabled}
      />
    </Tooltip>
  )
}
