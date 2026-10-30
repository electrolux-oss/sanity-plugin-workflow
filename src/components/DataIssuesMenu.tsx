import { useCallback, useState } from 'react'
import { useClient } from 'sanity'

import { WarningOutlineIcon } from '@sanity/icons/WarningOutline'
import { Box, Button, Dialog, Flex, Text } from '@sanity/ui'
import { Menu, MenuButton, MenuDivider, MenuItem } from '@sanity/ui/menu'
import { useToast } from '@sanity/ui/toast'
import { Tooltip } from '@sanity/ui/tooltip'

import { API_VERSION } from '../constants'
import { countAffectedDocuments } from '../helpers/dataIssues'
import { rerankStates } from '../helpers/ranking'
import { runWithToast } from '../helpers/runWithToast'
import FilterBarButtonContent from './FilterBarButtonContent'

import type { ToastMessages } from '../helpers/runWithToast'
import type { DataIssuesResult } from '../hooks/useDataIssues'
import type { UserExtended } from '../hooks/useUsers'
import type { SanityDocumentWithMetadata, State } from '../types'

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

type Confirmation = {
  title: string
  description: string
  confirmText: string
  onConfirm: () => void
}

type DataIssuesMenuProps = {
  issues: DataIssuesResult
  data: SanityDocumentWithMetadata[]
  states: State[]
  userList: UserExtended[]
}

/** Lists repairable workflow metadata problems, asking first before rewriting or deleting. */
export default function DataIssuesMenu(props: DataIssuesMenuProps) {
  const { issues, data, states, userList } = props
  const client = useClient({ apiVersion: API_VERSION })
  const toast = useToast()
  const [confirmation, setConfirmation] = useState<Confirmation>()
  const [menuOpen, setMenuOpen] = useState(false)

  const runRepair = useCallback(
    (write: () => Promise<unknown>, messages: ToastMessages) => {
      if (issues.simulated) {
        toast.push({
          status: 'info',
          title: `Simulated: ${messages.success}`,
          description: 'Nothing was changed'
        })
        return
      }

      runWithToast(toast, write, messages)
    },
    [issues.simulated, toast]
  )

  const commitPatches = useCallback(
    (ids: string[], buildPatch: (documentId: string, index: number) => Record<string, unknown>) => {
      const tx = client.transaction()

      ids.forEach((documentId, index) => {
        tx.patch(`workflow-metadata.${documentId}`, { set: buildPatch(documentId, index) })
      })

      return tx.commit()
    },
    [client]
  )

  // Moves documents with an unknown State to the first State
  const correctStates = useCallback(() => {
    const ids = issues.invalidStateIds
    const firstState = states[0]

    if (!firstState) {
      return
    }

    runRepair(() => commitPatches(ids, () => ({ state: firstState.id })), {
      pending: 'Correcting...',
      success: `Corrected ${plural(ids.length, 'Document')}`,
      error: 'Could not correct Document states'
    })
  }, [commitPatches, issues.invalidStateIds, runRepair, states])

  // Removes assignees who are no longer project users
  const removeInvalidAssignees = useCallback(() => {
    const ids = issues.invalidAssigneeIds
    const userIds = new Set(userList.map(u => u.id))
    const assigneesById = new Map(data.map(d => [d._metadata?.documentId, d._metadata?.assignees]))

    runRepair(
      () =>
        commitPatches(ids, documentId => ({
          assignees: (assigneesById.get(documentId) ?? []).filter(a => userIds.has(a))
        })),
      {
        pending: 'Removing users...',
        success: `Corrected ${plural(ids.length, 'Document')}`,
        error: 'Could not remove invalid users'
      }
    )
  }, [commitPatches, data, issues.invalidAssigneeIds, runRepair, userList])

  // Re-ranks the States containing the affected documents, keeping their current order
  const fixOrder = useCallback(() => {
    const affectedIds = new Set(issues.orderIssueIds)
    const affectedStateIds = data
      .filter(d => affectedIds.has(d._metadata?.documentId))
      .flatMap(d => (d._metadata?.state ? [d._metadata.state] : []))
    const ranks = rerankStates(data, affectedStateIds)

    runRepair(
      () =>
        commitPatches(
          ranks.map(r => r.documentId),
          (_, index) => ({ orderRank: ranks[index].orderRank })
        ),
      {
        pending: 'Fixing order...',
        success: `Fixed order of ${plural(ranks.length, 'Document')}`,
        error: 'Could not fix Document order'
      }
    )
  }, [commitPatches, data, issues.orderIssueIds, runRepair])

  const removeOrphans = useCallback(() => {
    const ids = issues.orphanIds

    runRepair(
      () => {
        const tx = client.transaction()

        ids.forEach(id => {
          tx.delete(`workflow-metadata.${id}`)
        })

        return tx.commit()
      },
      {
        pending: 'Removing orphaned metadata...',
        success: `Removed ${plural(ids.length, 'orphaned metadata document')}`,
        error: 'Failed to remove orphaned metadata'
      }
    )
  }, [client, issues.orphanIds, runRepair])

  const closeConfirmation = useCallback(() => setConfirmation(undefined), [])
  const affectedCount = countAffectedDocuments(issues)
  const hasRepairs =
    issues.invalidStateIds.length + issues.invalidAssigneeIds.length + issues.orderIssueIds.length >
    0
  const tooltip =
    affectedCount > 0
      ? `Problems found in the workflow data of ${plural(affectedCount, 'document')}`
      : 'No problems found in the workflow data'

  return (
    <>
      <Tooltip
        portal
        disabled={menuOpen}
        content={
          <Box padding={2}>
            <Text size={1}>{tooltip}</Text>
          </Box>
        }
      >
        {/* A disabled button gets no hover events, so the tooltip listens on this wrapper */}
        <Box>
          <MenuButton
            id="workflow-data-issues"
            onOpen={() => setMenuOpen(true)}
            onClose={() => setMenuOpen(false)}
            button={
              <Button
                mode="ghost"
                tone={affectedCount > 0 ? 'caution' : 'default'}
                disabled={affectedCount === 0}
                style={{ pointerEvents: affectedCount > 0 ? 'auto' : 'none' }}
              >
                <FilterBarButtonContent
                  text={affectedCount > 0 ? `Data issues (${affectedCount})` : 'Data issues'}
                  icon={WarningOutlineIcon}
                  dropdown
                />
              </Button>
            }
            popover={{ portal: true, placement: 'bottom-end' }}
            menu={
              <Menu>
                {issues.invalidStateIds.length > 0 && (
                  <MenuItem
                    tone="caution"
                    text={`Correct ${plural(issues.invalidStateIds.length, 'Document State')}`}
                    onClick={correctStates}
                  />
                )}
                {issues.invalidAssigneeIds.length > 0 && (
                  <MenuItem
                    tone="caution"
                    text={`Remove Invalid Users from ${plural(
                      issues.invalidAssigneeIds.length,
                      'Document'
                    )}`}
                    onClick={removeInvalidAssignees}
                  />
                )}
                {issues.orderIssueIds.length > 0 && (
                  <MenuItem
                    tone="caution"
                    text={`Fix Order for ${plural(issues.orderIssueIds.length, 'Document')}`}
                    onClick={() =>
                      setConfirmation({
                        title: 'Fix document order',
                        description:
                          'Every document in the affected States gets a new order rank. Their current order is kept.',
                        confirmText: 'Fix order',
                        onConfirm: fixOrder
                      })
                    }
                  />
                )}
                {hasRepairs && issues.orphanIds.length > 0 && <MenuDivider />}
                {issues.orphanIds.length > 0 && (
                  <MenuItem
                    tone="critical"
                    text={`Clean Up ${plural(
                      issues.orphanIds.length,
                      'Orphaned Metadata Document'
                    )}`}
                    onClick={() =>
                      setConfirmation({
                        title: 'Clean up orphaned metadata',
                        description:
                          'Workflow metadata whose document no longer exists is deleted. This cannot be undone.',
                        confirmText: 'Delete metadata',
                        onConfirm: removeOrphans
                      })
                    }
                  />
                )}
              </Menu>
            }
          />
        </Box>
      </Tooltip>
      {confirmation && (
        <Dialog
          id="workflow-data-issue-confirmation"
          header={confirmation.title}
          width={1}
          onClose={closeConfirmation}
          footer={
            <Flex justify="flex-end" gap={2} padding={3}>
              <Button mode="bleed" text="Cancel" onClick={closeConfirmation} />
              <Button
                tone="critical"
                text={confirmation.confirmText}
                onClick={() => {
                  confirmation.onConfirm()
                  closeConfirmation()
                }}
              />
            </Flex>
          }
        >
          <Box padding={4}>
            <Text size={1}>{confirmation.description}</Text>
          </Box>
        </Dialog>
      )}
    </>
  )
}
