import { useCallback, useMemo, useState } from 'react'
import { useCurrentUser } from 'sanity'
import { Feedback } from 'sanity-plugin-utils'

import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { Box, Card, Container, Flex, Grid, Spinner, Text, useTheme_v2 } from '@sanity/ui'
import { useToast } from '@sanity/ui/toast'

import { API_VERSION } from '../constants'
import { arraysContainMatchingString } from '../helpers/arraysContainMatchingString'
import { getDropOrderRank } from '../helpers/dropOrderRank'
import { filterItemsAndSort } from '../helpers/filterItemsAndSort'
import {
  readStoredLocales,
  shouldShowDocuments,
  shouldShowFilters
} from '../helpers/localeFilter'
import { useProjectUsers } from '../hooks/useUsers'
import { useWorkflowDocuments } from '../hooks/useWorkflowDocuments'
import { DocumentCard } from './DocumentCard'
import DocumentList from './DocumentList'
import Filters from './Filters'
import StateTitle from './StateTitle'
import Verify from './Verify'

import type { DraggableChildrenFn, DragStart, DropResult } from '@hello-pangea/dnd'
import type {
  FilterOptions,
  SanityDocumentWithMetadata,
  State,
  WorkflowConfig
} from '../types'
import type { Tool } from 'sanity'

const LOCALE_FILTER_STORAGE_KEY = 'studio.plugin.workflow.locale-filter'

type WorkflowToolProps = {
  tool: Tool<WorkflowConfig>
}

export default function WorkflowTool(props: WorkflowToolProps) {
  const { schemaTypes = [], states = [], filters = null } = props?.tool?.options ?? {}
  const [patchingIds, setPatchingIds] = useState<string[]>([])
  const [draggingFrom, setDraggingFrom] = useState('')
  const [undroppableStates, setUndroppableStates] = useState<string[]>([])
  const [selectedSchemaTypes, setSelectedSchemaTypes] = useState<string[]>(schemaTypes)

  const toast = useToast()
  const isDarkMode = useTheme_v2().color._dark
  const defaultCardTone = isDarkMode ? 'default' : 'transparent'

  const userList = useProjectUsers({ apiVersion: API_VERSION })

  const user = useCurrentUser()
  const userRoleNames = useMemo(
    () => (user?.roles?.length ? user.roles.map(r => r.name) : []),
    [user]
  )

  const filterOptions = useMemo(() => filters?.(user), [filters, user])
  const userLocales = filterOptions?.locales

  const [selectedLocales, setSelectedLocales] = useState<FilterOptions['locales']>(
    () =>
      readStoredLocales(LOCALE_FILTER_STORAGE_KEY) ?? (userLocales?.[0] ? [userLocales[0]] : [])
  )

  const showDocuments = shouldShowDocuments(userLocales, selectedLocales)

  const passedFilter = selectedLocales ? ({ locales: selectedLocales } as FilterOptions) : undefined

  const { workflowData, operations } = useWorkflowDocuments(passedFilter)

  // Data to display in cards
  const { data, loading, error } = workflowData

  // Operations to perform on cards
  const { move } = operations

  // When drag starts, check for any States we should not allow dropping on
  // Because of either:
  // 1. The "destination" State requires user assignment and the user is not assigned to the dragged document
  // 2. The "source" State State has a list of transitions and the "destination" State is not in that list
  const handleDragStart = useCallback(
    (start: DragStart) => {
      const { draggableId, source } = start
      const { droppableId: currentStateId } = source
      setDraggingFrom(currentStateId)

      const document = data.find(item => item._metadata?.documentId === draggableId)
      const state = states.find(s => s.id === currentStateId)

      // This shouldn't happen but TypeScript
      if (!document || !state) return

      const undroppableStateIds = []
      const statesThatRequireAssignmentIds = states.filter(s => s.requireAssignment).map(s => s.id)

      if (statesThatRequireAssignmentIds.length) {
        const documentAssignees = document._metadata?.assignees ?? []
        const userIsAssignedToDocument = user?.id ? documentAssignees.includes(user.id) : false

        if (!userIsAssignedToDocument) {
          undroppableStateIds.push(...statesThatRequireAssignmentIds)
        }
      }

      const statesThatCannotBeTransitionedToIds =
        state.transitions && state.transitions.length
          ? states.filter(s => !state.transitions?.includes(s.id)).map(s => s.id)
          : []

      if (statesThatCannotBeTransitionedToIds.length) {
        undroppableStateIds.push(...statesThatCannotBeTransitionedToIds)
      }

      // Remove currentStateId from undroppableStates
      const undroppableExceptSelf = undroppableStateIds.filter(id => id !== currentStateId)

      if (undroppableExceptSelf.length) {
        setUndroppableStates(undroppableExceptSelf)
      }
    },
    [data, states, user]
  )

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

      if (!data.length) {
        return
      }

      const newOrder = getDropOrderRank({
        data,
        states,
        draggableId,
        destinationStateId: destination.droppableId,
        destinationIndex: destination.index
      })

      setPatchingIds([...patchingIds, draggableId])
      toast.push({
        status: 'info',
        title: 'Updating document state...'
      })
      await move(draggableId, destination, states, newOrder)
      setPatchingIds((ids: string[]) => ids.filter(id => id !== draggableId))
    },
    [data, patchingIds, toast, move, states]
  )

  const toggleLocales = useCallback((locales: string[]) => {
    setSelectedLocales(prev => {
      const updatedLocales = Array.from(
        locales.reduce((set, locale) => {
          if (set.has(locale)) {
            set.delete(locale)
          } else {
            set.add(locale)
          }
          return set
        }, new Set(prev))
      )

      // Store in localStorage
      localStorage.setItem(LOCALE_FILTER_STORAGE_KEY, JSON.stringify(updatedLocales))

      return updatedLocales
    })
  }, [])

  // Used for the user filter UI
  const uniqueAssignedUsers = useMemo(() => {
    const uniqueUserIds = data.reduce((acc, item) => {
      const { assignees = [] } = item._metadata ?? {}
      const newAssignees = assignees?.length ? assignees.filter(a => !acc.includes(a)) : []
      return newAssignees.length ? [...acc, ...newAssignees] : acc
    }, [] as string[])

    return userList.filter(u => uniqueUserIds.includes(u.id))
  }, [data, userList])

  // Selected user IDs filter the visible workflow documents
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    uniqueAssignedUsers.map(u => u.id)
  )
  const toggleSelectedUser = useCallback((userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(u => u !== userId) : [...prev, userId]
    )
  }, [])

  const resetSelectedUsers = useCallback(() => {
    setSelectedUserIds([])
  }, [])

  // Selected schema types filter the visible workflow documents
  const toggleSelectedSchemaType = useCallback((schemaType: string) => {
    setSelectedSchemaTypes(prev =>
      prev.includes(schemaType) ? prev.filter(u => u !== schemaType) : [...prev, schemaType]
    )
  }, [])

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
          toggleLocales={toggleLocales}
          userLocales={userLocales}
        />
      )}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Grid gridTemplateColumns={states.length} height="fill">
          {states.map((state: State, stateIndex: number) => {
            const userRoleCanDrop = state?.roles?.length
              ? arraysContainMatchingString(state.roles, userRoleNames)
              : true
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
                    documentCount={showDocuments ? stateItems.length : 0}
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
                          {!loading && !showDocuments && (
                            <Flex align="center" justify="center" height="fill" padding={6}>
                              <Text size={3} align="center">
                                No documents found.
                                <br /> Have you selected a language in the filter?
                              </Text>
                            </Flex>
                          )}
                          {showDocuments && (
                            <DocumentList
                              items={stateItems}
                              invalidDocumentIds={invalidDocumentIds}
                              patchingIds={patchingIds}
                              state={state}
                              states={states}
                              toggleInvalidDocumentId={toggleInvalidDocumentId}
                              user={user}
                              userList={userList}
                              userRoleCanDrop={userRoleCanDrop}
                            />
                          )}
                          {/* Not required for virtualized lists */}
                          {/* {provided.placeholder} */}
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
