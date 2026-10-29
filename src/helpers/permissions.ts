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
 * Whether the user may work with documents in `state`. A state without `roles` is open to
 * everyone, `roles: []` to nobody, and a user without roles only to states without `roles`.
 */
export function userHasStateRole(userRoleNames: string[], state: State): boolean {
  if (!state.roles) {
    return true
  }

  return state.roles.some(role => userRoleNames.includes(role))
}

/**
 * The first rule that stops the user moving a document from `from` to `to`, or null when the
 * move is allowed. Roles apply to both states, while assignment is only required by the state
 * the document moves into.
 */
export function getTransitionBlocker({
  from,
  to,
  userId,
  userRoleNames,
  assignees
}: TransitionCheck): TransitionBlocker | null {
  if (!userHasStateRole(userRoleNames, from) || !userHasStateRole(userRoleNames, to)) {
    return 'role'
  }

  if (from.transitions?.length && !from.transitions.includes(to.id)) {
    return 'transition'
  }

  if (to.requireAssignment && !(userId && assignees?.includes(userId))) {
    return 'assignment'
  }

  return null
}
