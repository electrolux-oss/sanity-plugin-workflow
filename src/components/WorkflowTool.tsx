import { useCallback, useMemo, useState } from 'react'
import { useCurrentUser } from 'sanity'
import { Feedback } from 'sanity-plugin-utils'

import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { Box, Card, Container, Flex, Grid, Spinner, useTheme_v2 } from '@sanity/ui'
import { useToast } from '@sanity/ui/toast'

import { API_VERSION } from '../constants'
import { filterItemsAndSort } from '../helpers/filterItemsAndSort'
import { getQueryLocales, shouldShowFilters } from '../helpers/localeFilter'
import { getTransitionBlocker, userHasStateRole } from '../helpers/permissions'
import { getDropOrderRank } from '../helpers/ranking'
import { useDocumentFilters, useLocaleFilter } from '../hooks/useBoardFilters'
import { useProjectUsers } from '../hooks/useUsers'
import { useWorkflowDocuments } from '../hooks/useWorkflowDocuments'
import { DocumentCard } from './DocumentCard'
import DocumentList from './DocumentList'
import Filters from './Filters'
import StateTitle from './StateTitle'
import Verify from './Verify'

import type { DraggableChildrenFn, DragStart, DropResult } from '@hello-pangea/dnd'
import type { SanityDocumentWithMetadata, State, WorkflowConfig } from '../types'
import type { Tool } from 'sanity'

type WorkflowToolProps = {
  tool: Tool<WorkflowConfig>
}

export default function WorkflowTool(props: WorkflowToolProps) {
  const { schemaTypes = [], states = [], filters } = props?.tool?.options ?? {}
  const [patchingIds, setPatchingIds] = useState<string[]>([])
  const [draggingFrom, setDraggingFrom] = useState('')
  const [undroppableStates, setUndroppableStates] = useState<string[]>([])

  const toast = useToast()
  const isDarkMode = useTheme_v2().color._dark
  const defaultCardTone = isDarkMode ? 'default' : 'transparent'

  const userList = useProjectUsers({ apiVersion: API_VERSION })

  const user = useCurrentUser()
  const userRoleNames = useMemo(
    () => (user?.roles?.length ? user.roles.map(r => r.name) : []),
    [user]
  )

  const { userLocales, selectedLocales, setSelectedLocales } = useLocaleFilter(filters, user)

  const { workflowData, operations } = useWorkflowDocuments(
    getQueryLocales(userLocales, selectedLocales)
  )
  const { data, loading, error } = workflowData
  const { move } = operations

  const {
    uniqueAssignedUsers,
    selectedUserIds,
    toggleSelectedUser,
    resetSelectedUsers,
    selectedSchemaTypes,
    toggleSelectedSchemaType
  } = useDocumentFilters(data, userList, schemaTypes)

  // When drag starts, mark the States the dragged document cannot move to
  const handleDragStart = useCallback(
    (start: DragStart) => {
      const { draggableId, source } = start
      const { droppableId: currentStateId } = source
      setDraggingFrom(currentStateId)

      const document = data.find(item => item._metadata?.documentId === draggableId)
      const state = states.find(s => s.id === currentStateId)

      if (!document || !state) {
        return
      }

      setUndroppableStates(
        states
          .filter(
            target =>
              target.id !== currentStateId &&
              getTransitionBlocker({
                from: state,
                to: target,
                userId: user?.id,
                userRoleNames,
                assignees: document._metadata?.assignees
              })
          )
          .map(target => target.id)
      )
    },
    [data, states, user, userRoleNames]
  )

  // Document IDs that have validation errors
  const [invalidDocumentIds, setInvalidDocumentIds] = useState<string[]>([])
  const toggleInvalidDocumentId = useCallback((docId: string, action: 'ADD' | 'REMOVE') => {
    setInvalidDocumentIds(prev => {
      const isListed = prev.includes(docId)

      if (action === 'ADD') {
        return isListed ? prev : [...prev, docId]
      }

      return isListed ? prev.filter(id => id !== docId) : prev
    })
  }, [])

  // Filter once per State and reuse for both the header count and the list itself
  const itemsByState = useMemo(() => {
    const map = new Map<string, SanityDocumentWithMetadata[]>()

    for (const state of states) {
      map.set(state.id, filterItemsAndSort(data, state.id, selectedUserIds, selectedSchemaTypes))
    }

    return map
  }, [data, states, selectedUserIds, selectedSchemaTypes])

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      // Reset undroppable states
      setUndroppableStates([])
      setDraggingFrom(``)

      const { draggableId, source, destination } = result

      if (
        // No destination?
        !destination ||
        // No change in position?
        (destination.droppableId === source.droppableId && destination.index === source.index)
      ) {
        return
      }

      const newOrder = getDropOrderRank({
        columnItems: itemsByState.get(destination.droppableId) ?? [],
        draggableId,
        destinationIndex: destination.index
      })

      setPatchingIds(ids => [...ids, draggableId])
      toast.push({
        status: 'info',
        title: 'Updating document state...'
      })
      await move(draggableId, destination, states, newOrder)
      setPatchingIds((ids: string[]) => ids.filter(id => id !== draggableId))
    },
    [itemsByState, toast, move, states]
  )

  const Clone: DraggableChildrenFn = useCallback(
    (provided, snapshot, rubric) => {
      const item = data.find(doc => doc?._metadata?.documentId === rubric.draggableId)

      return (
        <div {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
          {item ? (
            <DocumentCard
              // Assumed false, if it's dragging it's not disabled
              isDragDisabled={false}
              // Assumed false, if it's dragging it's not patching
              isPatching={false}
              // Assumed true, if you can drag it you can drop it
              userRoleCanDrop
              isDragging={snapshot.isDragging}
              item={item}
              states={states}
              toggleInvalidDocumentId={toggleInvalidDocumentId}
              userList={userList}
            />
          ) : (
            <Feedback title="Item not found" tone="caution" />
          )}
        </div>
      )
    },
    [data, states, toggleInvalidDocumentId, userList]
  )

  if (!states?.length) {
    return (
      <Container width={1} padding={5}>
        <Feedback
          tone="caution"
          title="Plugin options error"
          description="No States defined in plugin config"
        />
      </Container>
    )
  }

  if (error && !data.length) {
    return (
      <Container width={1} padding={5}>
        <Feedback tone="critical" title="Error querying for Workflow documents" />
      </Container>
    )
  }

  return (
    <Flex direction="column" height="fill" overflow="hidden">
      <Verify data={data} userList={userList} states={states} />
      {shouldShowFilters(userLocales, schemaTypes, uniqueAssignedUsers.length) && (
        <Filters
          uniqueAssignedUsers={uniqueAssignedUsers}
          selectedUserIds={selectedUserIds}
          toggleSelectedUser={toggleSelectedUser}
          resetSelectedUsers={resetSelectedUsers}
          schemaTypes={schemaTypes}
          selectedSchemaTypes={selectedSchemaTypes}
          toggleSelectedSchemaType={toggleSelectedSchemaType}
          selectedLocales={selectedLocales}
          setSelectedLocales={setSelectedLocales}
          userLocales={userLocales}
        />
      )}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Grid gridTemplateColumns={states.length} height="fill">
          {states.map((state: State, stateIndex: number) => {
            const userRoleCanDrop = userHasStateRole(userRoleNames, state)
            const isDropDisabled = !userRoleCanDrop || undroppableStates.includes(state.id)

            const stateItems = itemsByState.get(state.id) ?? []

            return (
              <Card key={state.id} borderLeft={stateIndex > 0} tone={defaultCardTone}>
                <Flex direction="column" height="fill">
                  <StateTitle
                    state={state}
                    requireAssignment={state.requireAssignment ?? false}
                    userRoleCanDrop={userRoleCanDrop}
                    isDropDisabled={isDropDisabled}
                    draggingFrom={draggingFrom}
                    documentCount={stateItems.length}
                  />
                  <Box flex={1}>
                    <Droppable
                      droppableId={state.id}
                      isDropDisabled={isDropDisabled}
                      // props required for virtualization
                      mode="virtual"
                      renderClone={Clone}
                    >
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          tone={snapshot.isDraggingOver ? 'primary' : defaultCardTone}
                          height="fill"
                        >
                          {loading && (
                            <Flex padding={5} align="center" justify="center">
                              <Spinner muted />
                            </Flex>
                          )}
                          <DocumentList
                            items={stateItems}
                            invalidDocumentIds={invalidDocumentIds}
                            patchingIds={patchingIds}
                            states={states}
                            toggleInvalidDocumentId={toggleInvalidDocumentId}
                            userList={userList}
                            userRoleCanDrop={userRoleCanDrop}
                          />
                        </Card>
                      )}
                    </Droppable>
                  </Box>
                </Flex>
              </Card>
            )
          })}
        </Grid>
      </DragDropContext>
    </Flex>
  )
}
