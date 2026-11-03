import { readFileSync } from 'node:fs'

import { evaluate, parse } from 'groq-js'
import { describe, expect, it } from 'vitest'

import { getValidationId } from '../helpers/validationId'
import type { Metadata } from '../types'

// Read the query straight from source so the test cannot drift from what ships
const source = readFileSync(new URL('./useWorkflowDocuments.tsx', import.meta.url), 'utf8')
const QUERY = source.match(/const QUERY = `([\s\S]*?)`\n/)?.[1] ?? ''

type Doc = Record<string, unknown>

function metadata(documentId: string, locale = 'en'): Doc {
  return {
    _id: `workflow-metadata.${documentId}`,
    _type: 'workflow.metadata',
    _rev: 'rev',
    documentId,
    state: 'inReview',
    orderRank: `0|${documentId}`,
    assignees: [],
    locale
  }
}

function article(id: string, updatedAt: string): Doc {
  return { _id: id, _type: 'article', _rev: `rev-${id}`, _updatedAt: updatedAt }
}

async function run(dataset: Doc[], localeFilter?: string[]) {
  const result = await evaluate(parse(QUERY), {
    dataset,
    params: { filterByLocale: localeFilter !== undefined, localeFilter: localeFilter ?? [] }
  })

  return (await result.get()) as { _id?: string; _metadata: Metadata }[]
}

describe('workflow documents query', () => {
  it('was extracted from source', () => {
    expect(QUERY).toContain('workflow.metadata')
  })

  // Regression: the board reported the PUBLISHED document's validation markers,
  // so a clean draft showed a warning that only existed on the published version.
  describe('validation target', () => {
    it('targets the draft when one exists', async () => {
      const [item] = await run([
        metadata('a'),
        article('a', '2026-01-01T00:00:00Z'),
        article('drafts.a', '2026-02-01T00:00:00Z')
      ])

      expect(getValidationId(item._metadata)).toBe('drafts.a')
    })

    it('falls back to the published document when there is no draft', async () => {
      const [item] = await run([metadata('b'), article('b', '2026-01-01T00:00:00Z')])

      expect(getValidationId(item._metadata)).toBe('b')
    })

    it('targets the draft for a never-published document', async () => {
      const [item] = await run([metadata('c'), article('drafts.c', '2026-03-01T00:00:00Z')])

      expect(getValidationId(item._metadata)).toBe('drafts.c')
    })
  })

  // Regression: the draft and published icons both read the newest version, so every
  // card claimed to be edited and published at the same moment.
  describe('version timestamps', () => {
    it('reports the draft and published versions separately', async () => {
      const [item] = await run([
        metadata('a'),
        article('a', '2026-01-01T00:00:00Z'),
        article('drafts.a', '2026-02-01T00:00:00Z')
      ])

      expect(item?._metadata.publishedUpdatedAt).toBe('2026-01-01T00:00:00Z')
      expect(item?._metadata.draftUpdatedAt).toBe('2026-02-01T00:00:00Z')
    })

    it('reports no published version for a never-published document', async () => {
      const [item] = await run([metadata('c'), article('drafts.c', '2026-03-01T00:00:00Z')])

      expect(item?._metadata.publishedUpdatedAt).toBeNull()
      expect(item?._metadata.draftUpdatedAt).toBe('2026-03-01T00:00:00Z')
    })

    it('reports no draft once the document is published without edits', async () => {
      const [item] = await run([metadata('b'), article('b', '2026-01-01T00:00:00Z')])

      expect(item?._metadata.draftUpdatedAt).toBeNull()
    })
  })

  describe('locale filter', () => {
    const dataset = [
      metadata('a', 'en'),
      article('a', '2026-01-01T00:00:00Z'),
      metadata('b', 'sv'),
      article('b', '2026-01-01T00:00:00Z')
    ]

    // No filter must mean "no locale constraint", which is what lets the
    // board work when the optional `filters` config is not supplied.
    it('returns every locale without a filter', async () => {
      const result = await run(dataset)

      expect(result.map(i => i._metadata.documentId).sort()).toEqual(['a', 'b'])
    })

    // Regression: an empty selection loaded every locale, so the assignee filter and Verify
    // saw documents in languages the editor had not selected
    it('returns nothing for an empty selection', async () => {
      expect(await run(dataset, [])).toEqual([])
    })

    it('restricts to the selected locales', async () => {
      const result = await run(dataset, ['sv'])

      expect(result.map(i => i._metadata.documentId)).toEqual(['b'])
    })

    it('supports selecting several locales', async () => {
      const result = await run(dataset, ['en', 'sv'])

      expect(result.map(i => i._metadata.documentId).sort()).toEqual(['a', 'b'])
    })
  })

  it('returns the document locale, which decides who can be assigned', async () => {
    const [item] = await run([metadata('a', 'sv-SE'), article('a', '2026-01-01T00:00:00Z')])

    expect(item?._metadata.locale).toBe('sv-SE')
  })

  it('leaves _id undefined for orphaned metadata so Verify can detect it', async () => {
    const [item] = await run([metadata('gone')])

    expect(item?._id).toBeUndefined()
    expect(item?._metadata.documentId).toBe('gone')
  })
})
