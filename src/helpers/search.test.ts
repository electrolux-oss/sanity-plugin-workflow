import { describe, expect, it } from 'vitest'

import { searchOptions } from './search'

const philip = {
  label: 'Philip Åkerfeldt',
  keywords: ['Philip', undefined, 'Åkerfeldt', 'philip.akerfeldt@example.com']
}
const anna = { label: 'Anna Svensson', keywords: ['anna@example.com'] }
const swedish = { label: 'Swedish (Sweden)', keywords: ['sv-SE'] }

describe('searchOptions', () => {
  it('returns every option for an empty search', () => {
    expect(searchOptions([philip, anna], '  ')).toEqual([philip, anna])
  })

  // Regression: the user search lowercased names but not the query, so any capital found nothing
  it('ignores case in the query', () => {
    expect(searchOptions([philip, anna], 'Philip')).toEqual([philip])
  })

  // Regression: the user search only matched the start of each name
  it('matches anywhere in the label', () => {
    expect(searchOptions([philip, anna], 'kerfeldt')).toEqual([philip])
  })

  it('matches keywords such as an email address or locale code', () => {
    expect(searchOptions([philip, anna], 'anna@')).toEqual([anna])
    expect(searchOptions([swedish], 'sv-se')).toEqual([swedish])
  })
})
