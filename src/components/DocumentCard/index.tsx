import { useCallback, useEffect, useMemo, useState } from 'react'
import { Preview, useSchema } from 'sanity'

import { DragHandleIcon } from '@sanity/icons/DragHandle'
import { EditIcon } from '@sanity/icons/Edit'
import { PublishIcon } from '@sanity/icons/Publish'
import { Box, Card, Flex, Stack, useTheme_v2 } from '@sanity/ui'

import { cannotChangeAssigneesMessage } from '../../helpers/permissions'
import { getValidationId } from '../../helpers/validationId'
import UserDisplay from '../UserDisplay'
import CompleteButton from './CompleteButton'
import EditButton from './EditButton'
import Validate from './Validate'
import { ValidationStatus } from './ValidationStatus'
import { VersionStatus } from './VersionStatus'

import type { SchemaType, ValidationMarker } from 'sanity'
import type { CardTone } from '@sanity/ui'

import type { UserExtended } from '../../hooks/useUsers'
import type { SanityDocumentWithMetadata, State } from '../../types'

type DocumentCardProps = {
  isDragDisabled: boolean
  isPatching: boolean
  userRoleCanDrop: boolean
  isDragging: boolean
  item: SanityDocumentWithMetadata
  states: State[]
  toggleInvalidDocumentId: (documentId: string, action: 'ADD' | 'REMOVE') => void
  userList: UserExtended[]
}

export function DocumentCard(props: DocumentCardProps) {
  const {
    isDragDisabled,
    isPatching,
    userRoleCanDrop,
    isDragging,
    item,
    states,
    toggleInvalidDocumentId,
    userList
  } = props
  const { assignees = [], documentId, draftUpdatedAt, publishedUpdatedAt } = item._metadata ?? {}
  const schema = useSchema()
  const state = states.find(s => s.id === item._metadata?.state)

  const validationId = getValidationId(item._metadata)

  const isDarkMode = useTheme_v2().color._dark
  const defaultCardTone = isDarkMode ? `transparent` : `default`

  // Validation only runs if the state requests it
  // Because it's not performant to run it on many documents simultaneously
  // So we fake it here, and maybe set it inside <Validate />
  const [optimisticValidation, setOptimisticValidation] = useState<{
    isValidating: boolean
    validation: ValidationMarker[]
  }>({
    isValidating: state?.requireValidation ?? false,
    validation: []
  })

  const { isValidating, validation } = optimisticValidation

  const handleValidation = useCallback(
    (updates: { isValidating: boolean; validation: ValidationMarker[] }) => {
      setOptimisticValidation(updates)
    },
    []
  )

  const hasError = !isValidating && validation.some(v => v.level === 'error')

  const cardTone = useMemo((): CardTone => {
    const mutedTone = isDarkMode ? `default` : `transparent`

    if (!userRoleCanDrop) {
      return mutedTone
    }

    if (!documentId) {
      return defaultCardTone
    }

    if (state?.requireValidation && !isValidating && validation.length > 0) {
      return hasError ? `critical` : `caution`
    }

    if (isDragging) {
      return `positive`
    }

    return isPatching ? mutedTone : defaultCardTone
  }, [
    defaultCardTone,
    userRoleCanDrop,
    isPatching,
    isDarkMode,
    documentId,
    isDragging,
    isValidating,
    validation,
    hasError,
    state?.requireValidation
  ])

  useEffect(() => {
    toggleInvalidDocumentId(documentId, hasError ? 'ADD' : 'REMOVE')
  }, [documentId, hasError, toggleInvalidDocumentId])

  const isLastState = states[states.length - 1]?.id === item._metadata?.state

  return (
    <>
      {state?.requireValidation && (
        <Validate documentId={validationId} type={item._type} onChange={handleValidation} />
      )}
      <Box paddingBottom={3} paddingX={3}>
        <Card radius={2} shadow={isDragging ? 3 : 1} tone={cardTone}>
          <Stack>
            <Card
              borderBottom
              radius={2}
              paddingRight={2}
              tone={cardTone}
              style={{ pointerEvents: 'none' }}
            >
              <Flex align="center" justify="space-between" gap={1}>
                <Box flex={1}>
                  <Preview
                    layout="default"
                    skipVisibilityCheck
                    value={item}
                    schemaType={schema.get(item._type) as SchemaType}
                  />
                </Box>
                <Box style={{ flexShrink: 0 }}>
                  {!hasError && !isDragDisabled && !isPatching && <DragHandleIcon />}
                </Box>
              </Flex>
            </Card>

            <Card padding={2} radius={2} tone="inherit">
              <Flex align="center" justify="space-between" gap={3}>
                <Box flex={1}>
                  {documentId && (
                    <UserDisplay
                      userList={userList}
                      assignees={assignees}
                      documentId={documentId}
                      locale={item._metadata.locale}
                      disabled={!userRoleCanDrop}
                      disabledReason={cannotChangeAssigneesMessage(state?.title)}
                    />
                  )}
                </Box>
                {validation.length > 0 && <ValidationStatus validation={validation} />}
                <VersionStatus
                  updatedAt={draftUpdatedAt}
                  icon={EditIcon}
                  tone="caution"
                  label="Edited"
                  missingLabel="No unpublished edits"
                />
                <VersionStatus
                  updatedAt={publishedUpdatedAt}
                  icon={PublishIcon}
                  tone="positive"
                  label="Published"
                  missingLabel="Not published"
                />
                <EditButton id={item._id} type={item._type} disabled={!userRoleCanDrop} />
                {isLastState && states.length <= 3 && (
                  <CompleteButton documentId={documentId} disabled={!userRoleCanDrop} />
                )}
              </Flex>
              {isLastState && states.length > 3 && (
                <Stack paddingTop={2}>
                  <CompleteButton documentId={documentId} disabled={!userRoleCanDrop} />
                </Stack>
              )}
            </Card>
          </Stack>
        </Card>
      </Box>
    </>
  )
}
