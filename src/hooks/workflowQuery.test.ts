import { readFileSync } from 'node:fs'
import { evaluate, parse } from 'groq-js'
import { describe, expect, it } from 'vitest'

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

async function run(dataset: Doc[], localeFilter: string[] = []) {
  const result = await evaluate(parse(QUERY), { dataset, params: { localeFilter } })

  return (await result.get()) as {
    _id?: string
    _metadata: { documentId: string; hasDraft?: boolean; draftDocumentId?: string; locale: string }
  }[]
}

/** Mirrors how DocumentCard picks the document to validate */
function validationIdFor(m: { documentId: string; hasDraft?: boolean; draftDocumentId?: string }) {
  return m.hasDraft ? m.draftDocumentId ?? `drafts.${m.documentId}` : m.documentId
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

      expect(item?._metadata.hasDraft).toBe(true)
      expect(validationIdFor(item!._metadata)).toBe('drafts.a')
    })

    it('falls back to the published document when there is no draft', async () => {
      const [item] = await run([metadata('b'), article('b', '2026-01-01T00:00:00Z')])

      expect(item?._metadata.hasDraft).toBe(false)
      expect(validationIdFor(item!._metadata)).toBe('b')
    })

    it('targets the draft for a never-published document', async () => {
      const [item] = await run([metadata('c'), article('drafts.c', '2026-03-01T00:00:00Z')])

      expect(item?._metadata.hasDraft).toBe(true)
      expect(validationIdFor(item!._metadata)).toBe('drafts.c')
    })
  })

  describe('locale filter', () => {
    const dataset = [
      metadata('a', 'en'),
      article('a', '2026-01-01T00:00:00Z'),
      metadata('b', 'sv'),
      article('b', '2026-01-01T00:00:00Z')
    ]

    // An empty filter must mean "no locale constraint", which is what lets the
    // board work when the optional `filters` config is not supplied.
    it('returns every locale when the filter is empty', async () => {
      const result = await run(dataset, [])

      expect(result.map(i => i._metadata.documentId).sort()).toEqual(['a', 'b'])
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

  it('leaves _id undefined for orphaned metadata so Verify can detect it', async () => {
    const [item] = await run([metadata('gone')])

    expect(item?._id).toBeUndefined()
    expect(item?._metadata.documentId).toBe('gone')
  })
})
