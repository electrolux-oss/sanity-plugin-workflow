import { useCallback, useEffect, useMemo, useState } from 'react'

import { readStoredLocales, shouldShowDocuments, writeStoredLocales } from '../helpers/localeFilter'

import type { CurrentUser } from 'sanity'

import type { UserExtended } from './useUsers'
import type { SanityDocumentWithMetadata, WorkflowConfig } from '../types'

const LOCALE_FILTER_STORAGE_KEY = 'studio.plugin.workflow.locale-filter'

type LocaleFilter = {
  userLocales: string[] | undefined
  selectedLocales: string[]
  toggleLocales: (locales: string[]) => void
  showDocuments: boolean
}

type DocumentFilters = {
  uniqueAssignedUsers: UserExtended[]
  selectedUserIds: string[]
  toggleSelectedUser: (userId: string) => void
  resetSelectedUsers: () => void
  selectedSchemaTypes: string[]
  toggleSelectedSchemaType: (schemaType: string) => void
}

/** Adds each item that is missing from `list` and removes each one that is present. */
function toggleItems(list: string[], items: string[]): string[] {
  const toggled = new Set(list)

  for (const item of items) {
    if (toggled.has(item)) {
      toggled.delete(item)
    } else {
      toggled.add(item)
    }
  }

  return [...toggled]
}

/**
 * The locales the user may filter by and their remembered selection. The selection feeds the
 * documents query, so it is kept apart from the filters that work on loaded documents.
 */
export function useLocaleFilter(
  filters: WorkflowConfig['filters'],
  user: CurrentUser | null
): LocaleFilter {
  const userLocales = useMemo(() => filters?.(user)?.locales, [filters, user])

  const [selectedLocales, setSelectedLocales] = useState<string[]>(
    () => readStoredLocales(LOCALE_FILTER_STORAGE_KEY) ?? (userLocales?.[0] ? [userLocales[0]] : [])
  )

  useEffect(() => {
    writeStoredLocales(LOCALE_FILTER_STORAGE_KEY, selectedLocales)
  }, [selectedLocales])

  const toggleLocales = useCallback((locales: string[]) => {
    setSelectedLocales(prev => toggleItems(prev, locales))
  }, [])

  return {
    userLocales,
    selectedLocales,
    toggleLocales,
    showDocuments: shouldShowDocuments(userLocales, selectedLocales)
  }
}

/** Assignee and schema type filters over the loaded workflow documents. */
export function useDocumentFilters(
  data: SanityDocumentWithMetadata[],
  userList: UserExtended[],
  schemaTypes: string[]
): DocumentFilters {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedSchemaTypes, setSelectedSchemaTypes] = useState<string[]>(schemaTypes)

  const uniqueAssignedUsers = useMemo(() => {
    const assignedIds = new Set(data.flatMap(item => item._metadata?.assignees ?? []))

    return userList.filter(u => assignedIds.has(u.id))
  }, [data, userList])

  const toggleSelectedUser = useCallback((userId: string) => {
    setSelectedUserIds(prev => toggleItems(prev, [userId]))
  }, [])

  const resetSelectedUsers = useCallback(() => {
    setSelectedUserIds([])
  }, [])

  const toggleSelectedSchemaType = useCallback((schemaType: string) => {
    setSelectedSchemaTypes(prev => toggleItems(prev, [schemaType]))
  }, [])

  return {
    uniqueAssignedUsers,
    selectedUserIds,
    toggleSelectedUser,
    resetSelectedUsers,
    selectedSchemaTypes,
    toggleSelectedSchemaType
  }
}
