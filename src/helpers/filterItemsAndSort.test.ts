import { describe, expect, it } from 'vitest'

import { doc } from './__fixtures__/documents'
import { filterItemsAndSort } from './filterItemsAndSort'

describe('filterItemsAndSort', () => {
  it('drops items whose underlying document no longer exists', () => {
    const orphan = doc({ metadata: { documentId: 'gone' } })
    // @ts-expect-error - deliberately modelling an orphaned metadata document
    delete orphan._id

    const result = filterItemsAndSort([orphan, doc()], 'inReview', [], null)

    expect(result).toHaveLength(1)
    expect(result[0]?._metadata.documentId).toBe('a')
  })

  it('only returns items in the requested state', () => {
    const items = [
      doc({ _id: 'a', metadata: { documentId: 'a', state: 'inReview' } }),
      doc({ _id: 'b', metadata: { documentId: 'b', state: 'approved' } })
    ]

    expect(filterItemsAndSort(items, 'approved', [], null).map(i => i._id)).toEqual(['b'])
  })

  it('sorts by orderRank rather than insertion order', () => {
    const items = [
      doc({ _id: 'c', metadata: { documentId: 'c', orderRank: '0|c' } }),
      doc({ _id: 'a', metadata: { documentId: 'a', orderRank: '0|a' } }),
      doc({ _id: 'b', metadata: { documentId: 'b', orderRank: '0|b' } })
    ]

    expect(filterItemsAndSort(items, 'inReview', [], null).map(i => i._id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps everything when no users are selected', () => {
    const items = [
      doc({ _id: 'a', metadata: { documentId: 'a', assignees: ['u1'] } }),
      doc({ _id: 'b', metadata: { documentId: 'b', assignees: [] } })
    ]

    expect(filterItemsAndSort(items, 'inReview', [], null)).toHaveLength(2)
  })

  it('filters by assignee when users are selected', () => {
    const items = [
      doc({ _id: 'a', metadata: { documentId: 'a', assignees: ['u1'] } }),
      doc({ _id: 'b', metadata: { documentId: 'b', assignees: ['u2'] } })
    ]

    expect(filterItemsAndSort(items, 'inReview', ['u1'], null).map(i => i._id)).toEqual(['a'])
  })

  it('tolerates a null assignees array', () => {
    const items = [doc({ _id: 'a', metadata: { documentId: 'a', assignees: null } })]

    expect(() => filterItemsAndSort(items, 'inReview', ['u1'], null)).not.toThrow()
    expect(filterItemsAndSort(items, 'inReview', [], null)).toHaveLength(1)
  })

  it('treats a null schema type list as "no schema filtering"', () => {
    const items = [doc({ _type: 'product', metadata: { documentId: 'a' } })]

    expect(filterItemsAndSort(items, 'inReview', [], null)).toHaveLength(1)
  })

  it('returns nothing when the schema type list is empty', () => {
    const items = [doc()]

    expect(filterItemsAndSort(items, 'inReview', [], [])).toHaveLength(0)
  })

  it('filters by selected schema types', () => {
    const items = [
      doc({ _id: 'a', _type: 'article', metadata: { documentId: 'a' } }),
      doc({ _id: 'b', _type: 'product', metadata: { documentId: 'b' } })
    ]

    expect(filterItemsAndSort(items, 'inReview', [], ['product']).map(i => i._id)).toEqual(['b'])
  })
})
