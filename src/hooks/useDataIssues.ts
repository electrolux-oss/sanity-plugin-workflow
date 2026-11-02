import { useMemo, useState } from 'react'

import { findDataIssues, simulateDataIssues } from '../helpers/dataIssues'

import type { DataIssues } from '../helpers/dataIssues'
import type { UserExtended } from './useUsers'
import type { SanityDocumentWithMetadata, State } from '../types'

const SIMULATE_STORAGE_KEY = 'studio.plugin.workflow.simulate-data-issues'

export type DataIssuesResult = DataIssues & { simulated: boolean }

function isSimulatingDataIssues(): boolean {
  try {
    return window.localStorage.getItem(SIMULATE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Repairable workflow metadata problems. Setting the `studio.plugin.workflow.simulate-data-issues`
 * localStorage key to "true" reports made-up issues instead, whose repairs change nothing.
 */
export function useDataIssues(
  data: SanityDocumentWithMetadata[],
  states: State[],
  userList: UserExtended[]
): DataIssuesResult {
  const [simulated] = useState(isSimulatingDataIssues)

  return useMemo(
    () => ({
      ...(simulated ? simulateDataIssues(data) : findDataIssues(data, states, userList)),
      simulated
    }),
    [simulated, data, states, userList]
  )
}
