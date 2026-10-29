import { LexoRank } from 'lexorank'

import type { SanityDocumentWithMetadata, State } from '../types'

type DropOrderRankOptions = {
  data: SanityDocumentWithMetadata[]
  columnItems: SanityDocumentWithMetadata[]
  states: State[]
  draggableId: string
  destinationStateId: string
  destinationIndex: number
}

/**
 * The orderRank for a document dropped at `destinationIndex` in a state column.
 * `columnItems` must be the destination column exactly as rendered, filters included,
 * because that is the list dnd's index points into.
 * `data` must be sorted by orderRank, as the workflow query returns it.
 */
export function getDropOrderRank({
  data,
  columnItems,
  states,
  draggableId,
  destinationStateId,
  destinationIndex
}: DropOrderRankOptions): string {
  // dnd reports the destination index as if the dragged item were already removed from the list
  const destinationStateItems = columnItems.filter(
    item => item._metadata?.documentId !== draggableId
  )
  const destinationStateIndex = states.findIndex(s => s.id === destinationStateId)
  const isFirstState = destinationStateIndex === 0
  const isLastState = destinationStateIndex === states.length - 1

  // Documents can legitimately be missing an orderRank (the Verify panel repairs those),
  // so fall back rather than letting LexoRank.parse throw mid-drag
  const globalMinimum = data[0]?._metadata?.orderRank
  const globalMaximum = data[data.length - 1]?._metadata?.orderRank
  const globalStateMinimumRank = globalMinimum ? LexoRank.parse(globalMinimum) : LexoRank.min()
  const globalStateMaximumRank = globalMaximum ? LexoRank.parse(globalMaximum) : LexoRank.max()

  if (!destinationStateItems.length) {
    // Only the first state should generate an absolute minimum rank
    return isFirstState ? LexoRank.min().toString() : LexoRank.min().genNext().toString()
  }

  if (destinationIndex === 0) {
    const firstItemOrderRank = destinationStateItems[0]._metadata?.orderRank

    if (firstItemOrderRank) {
      return LexoRank.parse(firstItemOrderRank).genPrev().toString()
    }

    return isFirstState
      ? LexoRank.min().toString()
      : globalStateMinimumRank.between(LexoRank.min()).toString()
  }

  if (destinationIndex >= destinationStateItems.length) {
    const lastItemOrderRank =
      destinationStateItems[destinationStateItems.length - 1]._metadata?.orderRank

    if (lastItemOrderRank) {
      return LexoRank.parse(lastItemOrderRank).genNext().toString()
    }

    return isLastState
      ? LexoRank.max().toString()
      : globalStateMaximumRank.between(LexoRank.min()).toString()
  }

  const itemBeforeRank = destinationStateItems[destinationIndex - 1]._metadata?.orderRank
  const itemAfterRank = destinationStateItems[destinationIndex]._metadata?.orderRank

  let itemBeforeRankParsed = globalStateMinimumRank

  if (itemBeforeRank) {
    itemBeforeRankParsed = LexoRank.parse(itemBeforeRank)
  } else if (isFirstState) {
    itemBeforeRankParsed = LexoRank.min()
  }

  let itemAfterRankParsed = globalStateMaximumRank

  if (itemAfterRank) {
    itemAfterRankParsed = LexoRank.parse(itemAfterRank)
  } else if (isLastState) {
    itemAfterRankParsed = LexoRank.max()
  }

  return itemBeforeRankParsed.between(itemAfterRankParsed).toString()
}
