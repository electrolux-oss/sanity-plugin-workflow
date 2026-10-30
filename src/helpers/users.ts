import type { CurrentUser } from 'sanity'

import { userHasStateRole } from './permissions'

import type { UserExtended } from '../hooks/useUsers'
import type { State, WorkflowConfig } from '../types'

/** Matches anywhere in a user's names or email, ignoring case. */
export function searchUsers(users: UserExtended[], query: string): UserExtended[] {
  const needle = query.trim().toLowerCase()

  if (!needle) {
    return users
  }

  return users.filter(user =>
    [user.displayName, user.givenName, user.middleName, user.familyName, user.email].some(field =>
      field?.toLowerCase().includes(needle)
    )
  )
}

/**
 * Users holding at least one role that can work with documents in some State. When a State
 * sets no `roles` it is open to everyone, so every user is eligible.
 */
export function filterUsersByStateRoles(users: UserExtended[], states: State[]): UserExtended[] {
  if (states.some(state => !state.roles)) {
    return users
  }

  const stateRoles = new Set(states.flatMap(state => state.roles ?? []))

  return users.filter(user => user.roles?.some(role => stateRoles.has(role.name)))
}

function toCurrentUser(user: UserExtended): CurrentUser {
  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    profileImage: user.imageUrl,
    role: user.roles?.[0]?.name ?? '',
    roles: user.roles ?? []
  }
}

/** Whether `user` works in `locale`, according to the `filters` config. Unrestricted without either. */
export function worksInLocale(
  user: CurrentUser,
  filters: WorkflowConfig['filters'],
  locale: string | null | undefined
): boolean {
  return !filters || !locale || (filters(user)?.locales ?? []).includes(locale)
}

type AssignableUsersOptions = {
  states: State[]
  filters: WorkflowConfig['filters']
  locale: string | null | undefined
  assignees: string[]
}

/**
 * Users who may be assigned to a document: they hold a role from some State and, when the
 * `filters` config limits users to locales, work in the document's locale. Current assignees
 * are always kept so they can still be removed.
 */
export function getAssignableUsers(
  users: UserExtended[],
  { states, filters, locale, assignees }: AssignableUsersOptions
): UserExtended[] {
  const eligibleIds = new Set(
    filterUsersByStateRoles(users, states)
      .filter(user => worksInLocale(toCurrentUser(user), filters, locale))
      .map(user => user.id)
  )

  return users.filter(user => eligibleIds.has(user.id) || assignees.includes(user.id))
}

type CanAssignOptions = {
  state: State | undefined
  filters: WorkflowConfig['filters']
  locale: string | null | undefined
}

/**
 * Whether `user` may change a document's assignees: they hold a role for the State the document
 * is in and work in its locale.
 */
export function canAssignUsers(
  user: CurrentUser | null,
  { state, filters, locale }: CanAssignOptions
): boolean {
  if (!user || !state) {
    return false
  }

  return (
    userHasStateRole(
      user.roles.map(role => role.name),
      state
    ) && worksInLocale(user, filters, locale)
  )
}
