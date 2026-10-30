import { useEffect, useMemo, useState } from 'react'
import { useClient, useCurrentUser } from 'sanity'

import { useWorkflowContext } from '../components/WorkflowContext'
import { API_VERSION } from '../constants'
import { getAssignableUsers } from '../helpers/users'

import type { SanityClient } from 'sanity'

export type UserRole = {
  name: string
  title: string
}

export type UserExtended = {
  createdAt: string
  displayName: string
  email: string
  familyName: string
  givenName: string
  id: string
  imageUrl: string
  isCurrentUser: boolean
  middleName: string
  projectId: string
  provider: string
  roles?: UserRole[]
  sanityUserId: string
  updatedAt: string
}

type AclEntry = {
  isRobot: boolean
  projectUserId: string
  roles: UserRole[]
}

type HookConfig = {
  apiVersion?: string
}

const USER_ID_BATCH_SIZE = 200

const CACHE_TTL_MS = 5 * 60 * 1000

const EMPTY_USERS: UserExtended[] = []

/**
 * Shared across every hook instance so the project ACL and user lists are fetched
 * once per project rather than once per document action, badge and card.
 *
 * Cached entries are served immediately even once stale, and refreshed in the
 * background. Dropping stale entries instead would leave the assignee list empty
 * for two round trips every time the TTL lapsed.
 */
const inFlight = new Map<string, Promise<UserExtended[]>>()
const resolved = new Map<string, { users: UserExtended[]; fetchedAt: number }>()

function isStale(entry: { fetchedAt: number } | undefined): boolean {
  return !entry || Date.now() - entry.fetchedAt > CACHE_TTL_MS
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }

  return chunks
}

async function fetchProjectUsers(client: SanityClient, projectId: string): Promise<UserExtended[]> {
  const acl: AclEntry[] = await client.request({ url: `/projects/${projectId}/acl` })

  const rolesByUserId = new Map(acl.map(entry => [entry.projectUserId, entry.roles]))

  const userIds = acl
    .filter(entry => !(entry.roles.length === 1 && entry.roles[0]?.name === 'viewer'))
    .map(entry => entry.projectUserId)

  if (!userIds.length) {
    return EMPTY_USERS
  }

  const batches = await Promise.all(
    chunk(userIds, USER_ID_BATCH_SIZE).map(
      (ids): Promise<UserExtended[]> =>
        client.request({ url: `/projects/${projectId}/users/${ids.join(',')}` })
    )
  )

  return batches.flat().map(user => ({
    ...user,
    roles: rolesByUserId.get(user.id) ?? []
  }))
}

export function useProjectUsers({ apiVersion }: HookConfig = {}): UserExtended[] {
  const currentUser = useCurrentUser()
  const client = useClient({ apiVersion: apiVersion ?? API_VERSION })
  const { projectId } = client.config()

  const [users, setUsers] = useState<UserExtended[]>(
    () => (projectId ? resolved.get(projectId)?.users : undefined) ?? EMPTY_USERS
  )

  useEffect(() => {
    if (!projectId) {
      return undefined
    }

    const entry = resolved.get(projectId)

    // Show whatever we already have straight away, stale or not
    if (entry) {
      setUsers(entry.users)
    }

    if (!isStale(entry)) {
      return undefined
    }

    let cancelled = false
    let request = inFlight.get(projectId)

    if (!request) {
      request = fetchProjectUsers(client, projectId)
        .then(list => {
          resolved.set(projectId, { users: list, fetchedAt: Date.now() })
          return list
        })
        .finally(() => {
          inFlight.delete(projectId)
        })

      inFlight.set(projectId, request)
    }

    request
      .then(list => {
        if (!cancelled) {
          setUsers(list)
        }

        return list
      })
      .catch(err => {
        console.error('Failed to fetch users:', err)
      })

    return () => {
      cancelled = true
    }
  }, [client, projectId])

  return useMemo(
    () => users.map(user => ({ ...user, isCurrentUser: user.id === currentUser?.id })),
    [users, currentUser?.id]
  )
}

/** Project users who may be assigned to a document in `locale`, plus its current assignees. */
export function useAssignableUsers(
  locale: string | null | undefined,
  assignees: string[]
): UserExtended[] {
  const users = useProjectUsers()
  const { states, filters } = useWorkflowContext()

  return useMemo(
    () => getAssignableUsers(users, { states, filters, locale, assignees }),
    [users, states, filters, locale, assignees]
  )
}
