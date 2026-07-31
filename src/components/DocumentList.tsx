import { useCallback, useRef } from 'react'

import { Draggable } from '@hello-pangea/dnd'
import { useVirtualizer } from '@tanstack/react-virtual'

import { DocumentCard } from './DocumentCard'

import type { CSSProperties } from 'react'

import type { DraggableStyle } from '@hello-pangea/dnd'
import type { VirtualItem } from '@tanstack/react-virtual'
import type { CurrentUser } from 'sanity'
import type { UserExtended } from '../hooks/useUsers'

import type { SanityDocumentWithMetadata, State } from '../types'

type DocumentListProps = {
  items: SanityDocumentWithMetadata[]
  invalidDocumentIds: string[]
  patchingIds: string[]
  state: State
  states: State[]
  toggleInvalidDocumentId: (documentId: string, action: 'ADD' | 'REMOVE') => void
  user: CurrentUser | null
  userList: UserExtended[]
  userRoleCanDrop: boolean
}

function getStyle(
  draggableStyle: DraggableStyle | undefined,
  virtualItem: VirtualItem
): CSSProperties {
  // Default transform required by tanstack virtual for positioning
  let transform = `translateY(${virtualItem.start}px)`

  // If a card is being dragged over, this card needs to move up or down
  if (draggableStyle && draggableStyle.transform) {
    // So get the transform value from beautiful-dnd
    const draggableTransformY = parseInt(
      draggableStyle.transform.split(',')[1]!.split('px')[0]!,
      10
    )

    // And apply it to the card
    transform = `translateY(${virtualItem.start + draggableTransformY}px)`
  }

  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: `${virtualItem.size}px`,
    transform
  }
}

export default function DocumentList(props: DocumentListProps) {
  const {
    items = [],
    invalidDocumentIds,
    patchingIds,
    state,
    states,
    toggleInvalidDocumentId,
    user,
    userList,
    userRoleCanDrop
  } = props

  const parentRef = useRef(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: useCallback(() => parentRef.current, []),
    getItemKey: useCallback(index => items[index]?._metadata?.documentId ?? index, [items]),
    estimateSize: useCallback(() => 115, []),
    overscan: 7,
    measureElement: useCallback((element: Element) => {
      return element.getBoundingClientRect().height || 115
    }, [])
  })

  if (!items.length) {
    return null
  }

  return (
    <div
      ref={parentRef}
      style={{
        height: `100%`,
        overflow: 'auto',
        // Smooths scrollbar behaviour
        overflowAnchor: 'none',
        scrollBehavior: 'auto',
        paddingTop: 1
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const item = items[virtualItem.index]

          const { documentId, assignees } = item?._metadata ?? {}

          const isInvalid = invalidDocumentIds.includes(documentId!)
          const meInAssignees = user?.id ? assignees?.includes(user.id) : false
          const isDragDisabled =
            patchingIds.includes(documentId!) ||
            !userRoleCanDrop ||
            isInvalid ||
            !(state.requireAssignment ? state.requireAssignment && meInAssignees : true)

          return (
            <Draggable
              key={virtualItem.key}
              draggableId={documentId!}
              index={virtualItem.index}
              isDragDisabled={isDragDisabled}
            >
              {(draggableProvided, draggableSnapshot) => (
                <div
                  ref={draggableProvided.innerRef}
                  {...draggableProvided.draggableProps}
                  {...draggableProvided.dragHandleProps}
                  style={getStyle(draggableProvided.draggableProps.style, virtualItem)}
                >
                  <div ref={virtualizer.measureElement} data-index={virtualItem.index}>
                    <DocumentCard
                      userRoleCanDrop={userRoleCanDrop}
                      isDragDisabled={isDragDisabled}
                      isPatching={patchingIds.includes(documentId!)}
                      isDragging={draggableSnapshot.isDragging}
                      item={item!}
                      toggleInvalidDocumentId={toggleInvalidDocumentId}
                      userList={userList}
                      states={states}
                    />
                  </div>
                </div>
              )}
            </Draggable>
          )
        })}
      </div>
    </div>
  )
}
