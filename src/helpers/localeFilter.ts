import type { FilterOptions } from '../types'

/**
 * Locale filtering is opt-in via the plugin's `filters` config. When it is not
 * configured there is no locale constraint, so the board must not gate documents
 * behind a locale selection the editor has no UI to make.
 */
export function isLocaleFilterEnabled(userLocales?: FilterOptions['locales']): boolean {
  return Boolean(userLocales?.length)
}

/**
 * The locales to query for: no constraint when locale filtering is not configured, otherwise the
 * selection, where an empty selection means every locale the user works in.
 */
export function getQueryLocales(
  userLocales: FilterOptions['locales'] | undefined,
  selectedLocales: FilterOptions['locales']
): FilterOptions['locales'] | undefined {
  if (!isLocaleFilterEnabled(userLocales)) {
    return undefined
  }

  if (selectedLocales.length === 0) {
    return userLocales
  }

  return selectedLocales
}

/**
 * The filter bar carries assignee and schema type controls too, so it must not be
 * tied to how many locales exist.
 */
export function shouldShowFilters(
  userLocales: FilterOptions['locales'] | undefined,
  schemaTypes: string[],
  assignedUserCount: number
): boolean {
  return isLocaleFilterEnabled(userLocales) || schemaTypes.length > 1 || assignedUserCount > 0
}

export function readStoredLocales(storageKey: string): FilterOptions['locales'] | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    const stored = window.localStorage.getItem(storageKey)

    if (!stored) {
      return undefined
    }

    const parsed: unknown = JSON.parse(stored)

    if (!Array.isArray(parsed) || !parsed.every(l => typeof l === 'string')) {
      return undefined
    }

    return parsed
  } catch {
    // Corrupt or unavailable storage must not take the whole tool down
    return undefined
  }
}

export function writeStoredLocales(storageKey: string, locales: FilterOptions['locales']): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(locales))
  } catch {
    // Unavailable or full storage only costs the remembered selection
  }
}
