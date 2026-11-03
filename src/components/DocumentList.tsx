import { Draggable } from '@hello-pangea/dnd'
import type { DraggableStyle } from '@hello-pangea/dnd'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { VirtualItem } from '@tanstack/react-virtual'
import { useCallback, useRef } from 'react'
import type { CSSProperties } from 'react'

import type { UserExtended } from '../hooks/useUsers'
import type { SanityDocumentWithMetadata, State } from '../types'
import { DocumentCard } from './DocumentCard'

type DocumentListProps = {
  items: SanityDocumentWithMetadata[]
  invalidDocumentIds: string[]
  patchingIds: string[]
  states: State[]
  toggleInvalidDocumentId: (documentId: string, action: 'ADD' | 'REMOVE') => void
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
    states,
    toggleInvalidDocumentId,
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

          const { documentId } = item?._metadata ?? {}
          const isDragDisabled =
            patchingIds.includes(documentId!) ||
            !userRoleCanDrop ||
            invalidDocumentIds.includes(documentId!)

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
