import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getLanguageTitle,
  getQueryLocales,
  isLocaleFilterEnabled,
  readStoredLocales,
  shouldShowFilters,
  writeStoredLocales
} from './localeFilter'

describe('isLocaleFilterEnabled', () => {
  it('is off when the plugin has no `filters` config', () => {
    expect(isLocaleFilterEnabled(undefined)).toBe(false)
  })

  it('is off when `filters` returns an empty locale list', () => {
    expect(isLocaleFilterEnabled([])).toBe(false)
  })

  it('is on for a single locale', () => {
    expect(isLocaleFilterEnabled(['en'])).toBe(true)
  })
})

describe('getLanguageTitle', () => {
  const languages = [{ id: 'de-CH', title: 'German (Switzerland)' }]

  it('uses the configured title', () => {
    expect(getLanguageTitle('de-CH', languages)).toBe('German (Switzerland)')
  })

  it('falls back to the English language name', () => {
    expect(getLanguageTitle('sv-SE', languages)).toBe('Swedish (Sweden)')
  })
})

describe('getQueryLocales', () => {
  it('applies no locale constraint when locale filtering is not configured', () => {
    expect(getQueryLocales(undefined, [])).toBeUndefined()
    expect(getQueryLocales([], ['en'])).toBeUndefined()
  })

  it('queries exactly the selected locales when locale filtering is configured', () => {
    expect(getQueryLocales(['en', 'sv'], ['sv'])).toEqual(['sv'])
  })

  // An empty selection means every locale the user works in, never every locale in the dataset
  it('queries all of the user locales for an empty selection', () => {
    expect(getQueryLocales(['en', 'sv'], [])).toEqual(['en', 'sv'])
  })
})

describe('shouldShowFilters', () => {
  // Regression: the whole filter bar was gated on `userLocales.length > 1`, so
  // assignee and schema type filters vanished for single-locale projects.
  it('shows for a single locale when there are multiple schema types', () => {
    expect(shouldShowFilters(['en'], ['article', 'product'], 0)).toBe(true)
  })

  it('shows with no locales when there are assignees to filter', () => {
    expect(shouldShowFilters(undefined, ['article'], 3)).toBe(true)
  })

  it('shows when locale filtering is configured', () => {
    expect(shouldShowFilters(['en', 'sv'], ['article'], 0)).toBe(true)
  })

  it('hides when there is genuinely nothing to filter', () => {
    expect(shouldShowFilters(undefined, ['article'], 0)).toBe(false)
  })
})

describe('readStoredLocales', () => {
  const KEY = 'test.locale-filter'

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function withStorage(value: string | null): void {
    const store = new Map<string, string>()

    if (value !== null) {
      store.set(KEY, value)
    }

    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null
      }
    })
  }

  it('returns undefined when there is no window (server render)', () => {
    vi.stubGlobal('window', undefined)
    expect(readStoredLocales(KEY)).toBeUndefined()
  })

  it('returns undefined when nothing is stored', () => {
    withStorage(null)
    expect(readStoredLocales(KEY)).toBeUndefined()
  })

  it('returns a stored locale array', () => {
    withStorage(JSON.stringify(['en', 'sv']))
    expect(readStoredLocales(KEY)).toEqual(['en', 'sv'])
  })

  it('survives corrupt JSON instead of crashing the tool', () => {
    withStorage('{not json')
    expect(readStoredLocales(KEY)).toBeUndefined()
  })

  it('rejects a stored value that is not an array of strings', () => {
    withStorage(JSON.stringify({ locales: ['en'] }))
    expect(readStoredLocales(KEY)).toBeUndefined()

    withStorage(JSON.stringify([1, 2]))
    expect(readStoredLocales(KEY)).toBeUndefined()
  })
})

describe('writeStoredLocales', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores the selection as JSON', () => {
    const setItem = vi.fn()
    vi.stubGlobal('window', { localStorage: { setItem } })

    writeStoredLocales('key', ['en', 'sv'])

    expect(setItem).toHaveBeenCalledWith('key', '["en","sv"]')
  })

  // Regression: toggling a locale crashed the tool where storage throws, such as some
  // private browsing modes, although reading was already guarded.
  it('does not throw when storage is unavailable', () => {
    vi.stubGlobal('window', {
      localStorage: {
        setItem: () => {
          throw new Error('QuotaExceededError')
        }
      }
    })

    expect(() => writeStoredLocales('key', ['en'])).not.toThrow()
  })
})
