import { LexoRank } from 'lexorank'

import { filterItemsAndSort } from './filterItemsAndSort'
import { generateMultipleOrderRanks } from './generateMultipleOrderRanks'

import type { SanityDocumentWithMetadata } from '../types'

/**
 * A rank strictly between two neighbours. A missing neighbour is the edge of the column,
 * so ranks never collapse onto LexoRank's absolute minimum or maximum.
 */
export function rankBetween(lower?: string | null, upper?: string | null): string {
  const lowerRank = lower ? LexoRank.parse(lower) : LexoRank.min()
  const upperRank = upper ? LexoRank.parse(upper) : LexoRank.max()

  // LexoRank throws between equal ranks; duplicates are left for Verify to repair
  if (lowerRank.equals(upperRank)) {
    return lowerRank.genNext().toString()
  }

  return lowerRank.between(upperRank).toString()
}

type DropOrderRankOptions = {
  columnItems: SanityDocumentWithMetadata[]
  draggableId: string
  destinationIndex: number
}

/**
 * The orderRank for a document dropped at `destinationIndex`. `columnItems` must be the
 * destination column exactly as rendered, filters included, because that is the list dnd's
 * index points into.
 */
export function getDropOrderRank({
  columnItems,
  draggableId,
  destinationIndex
}: DropOrderRankOptions): string {
  // dnd reports the destination index as if the dragged item were already removed from the list
  const items = columnItems.filter(item => item._metadata?.documentId !== draggableId)

  return rankBetween(
    items[destinationIndex - 1]?._metadata?.orderRank,
    items[destinationIndex]?._metadata?.orderRank
  )
}

/** Fresh, evenly spread ranks for every document in the given states, keeping their order. */
export function rerankStates(
  data: SanityDocumentWithMetadata[],
  stateIds: Iterable<string>
): { documentId: string; orderRank: string }[] {
  return [...new Set(stateIds)].flatMap(stateId => {
    const items = filterItemsAndSort(data, stateId, [], null)
    const ranks = generateMultipleOrderRanks(items.length)

    return items.map((item, index) => ({
      documentId: item._metadata.documentId,
      orderRank: ranks[index].toString()
    }))
  })
}
