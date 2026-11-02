import { describe, expect, it } from 'vitest'

import { getTransitionBlocker, hasAnyRole } from './permissions'

import type { State } from '../types'

function state(id: string, overrides: Partial<State> = {}): State {
  return { id, title: id, ...overrides }
}

describe('hasAnyRole', () => {
  it('allows everyone when no roles are set', () => {
    expect(hasAnyRole([], undefined)).toBe(true)
  })

  it('allows users with one of the roles', () => {
    expect(hasAnyRole(['editor'], ['admin', 'editor'])).toBe(true)
  })

  it('denies users without one of the roles', () => {
    expect(hasAnyRole(['viewer'], ['editor'])).toBe(false)
  })

  // Regression: the document actions let a user without roles into restricted states
  it('denies users without any roles when roles are set', () => {
    expect(hasAnyRole([], ['editor'])).toBe(false)
  })

  // Regression: the board treated an empty list as unrestricted
  it('denies everyone for an empty role list', () => {
    expect(hasAnyRole(['admin'], [])).toBe(false)
  })
})

describe('getTransitionBlocker', () => {
  const editor = { userId: 'u1', userRoleNames: ['editor'], assignees: ['u1'] }

  it('allows an unrestricted move', () => {
    expect(getTransitionBlocker({ ...editor, from: state('a'), to: state('b') })).toBeNull()
  })

  it('requires the role of the state the document moves into', () => {
    const to = state('published', { roles: ['publisher'] })

    expect(getTransitionBlocker({ ...editor, from: state('a'), to })).toBe('role')
  })

  // Regression: the document actions only checked the target state's roles
  it('requires the role of the state the document leaves', () => {
    const from = state('published', { roles: ['publisher'] })

    expect(getTransitionBlocker({ ...editor, from, to: state('a') })).toBe('role')
  })

  it('only allows the transitions the current state lists', () => {
    const from = state('a', { transitions: ['b'] })

    expect(getTransitionBlocker({ ...editor, from, to: state('b') })).toBeNull()
    expect(getTransitionBlocker({ ...editor, from, to: state('c') })).toBe('transition')
  })

  // Regression: an empty list was treated as unrestricted, unlike roles: []
  it('allows no transitions from a state with an empty transitions list', () => {
    const from = state('readyToPublish', { transitions: [] })

    expect(getTransitionBlocker({ ...editor, from, to: state('b') })).toBe('transition')
  })

  it('requires assignment to move into a state that asks for it', () => {
    const to = state('approved', { requireAssignment: true })

    expect(getTransitionBlocker({ ...editor, from: state('a'), to })).toBeNull()
    expect(getTransitionBlocker({ ...editor, assignees: [], from: state('a'), to })).toBe(
      'assignment'
    )
  })

  // Regression: the board also locked unassigned users out of moving documents
  // out of a state that requires assignment
  it('does not require assignment to leave a state that asks for it', () => {
    const from = state('approved', { requireAssignment: true })

    expect(getTransitionBlocker({ ...editor, assignees: [], from, to: state('a') })).toBeNull()
  })
})
