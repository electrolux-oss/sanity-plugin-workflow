import type { State } from '../types'

export type TransitionBlocker = 'role' | 'transition' | 'assignment'

type TransitionCheck = {
  from: State
  to: State
  userId: string | undefined
  userRoleNames: string[]
  assignees: string[] | null | undefined
}

/**
 * Whether the user holds one of `roles`. Leaving `roles` out allows everyone, an empty list
 * allows nobody, and a user without roles is only allowed where `roles` is left out.
 */
export function hasAnyRole(userRoleNames: string[], roles: string[] | undefined): boolean {
  if (!roles) {
    return true
  }

  return roles.some(role => userRoleNames.includes(role))
}

/** Why a user without a role for the document's current State cannot change its assignees. */
export function cannotChangeAssigneesMessage(stateTitle: string | undefined): string {
  return `Your role cannot change assignees in "${stateTitle}"`
}

/**
 * The first rule that stops the user moving a document from `from` to `to`, or null when the
 * move is allowed. Roles apply to both states, while assignment is only required by the state
 * the document moves into. A state without `transitions` may move anywhere, `transitions: []`
 * nowhere.
 */
export function getTransitionBlocker({
  from,
  to,
  userId,
  userRoleNames,
  assignees
}: TransitionCheck): TransitionBlocker | null {
  if (!hasAnyRole(userRoleNames, from.roles) || !hasAnyRole(userRoleNames, to.roles)) {
    return 'role'
  }

  if (from.transitions && !from.transitions.includes(to.id)) {
    return 'transition'
  }

  if (to.requireAssignment && !(userId && assignees?.includes(userId))) {
    return 'assignment'
  }

  return null
}
