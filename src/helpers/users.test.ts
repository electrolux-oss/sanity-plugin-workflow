import { describe, expect, it } from 'vitest'

import { filterUsersByStateRoles, getAssignableUsers } from './users'

import type { UserExtended } from '../hooks/useUsers'
import type { State, WorkflowConfig } from '../types'

function user(id: string, overrides: Partial<UserExtended> = {}): UserExtended {
  return {
    id,
    displayName: id,
    givenName: '',
    middleName: '',
    familyName: '',
    email: `${id}@example.com`,
    roles: [],
    ...overrides
  } as UserExtended
}

describe('filterUsersByStateRoles', () => {
  const contributor = user('c1', { roles: [{ name: 'km---contributor', title: 'Contributor' }] })
  const viewer = user('v1', { roles: [{ name: 'viewer', title: 'Viewer' }] })
  const roleless = user('r1')

  const states: State[] = [
    { id: 'wip', title: 'WIP', roles: ['km---candidate', 'km---contributor'] },
    { id: 'ready', title: 'Ready', roles: ['km---publisher'] }
  ]

  it('keeps users holding a role from any State', () => {
    expect(filterUsersByStateRoles([contributor, viewer, roleless], states)).toEqual([contributor])
  })

  it('keeps everyone when a State is open to all roles', () => {
    const openStates = [...states, { id: 'open', title: 'Open' }]

    expect(filterUsersByStateRoles([contributor, viewer, roleless], openStates)).toHaveLength(3)
  })

  it('keeps nobody when every State allows no roles', () => {
    expect(filterUsersByStateRoles([contributor], [{ id: 'x', title: 'X', roles: [] }])).toEqual([])
  })
})

describe('getAssignableUsers', () => {
  const states: State[] = [
    { id: 'wip', title: 'WIP', roles: ['km---contributor', 'administrator'] }
  ]
  const contributorRole = { name: 'km---contributor', title: 'Contributor' }
  const swedish = user('sv', { roles: [contributorRole, { name: 'locale-sv-se', title: 'sv' }] })
  const german = user('de', { roles: [contributorRole, { name: 'locale-de-de', title: 'de' }] })
  const admin = user('admin', { roles: [{ name: 'administrator', title: 'Admin' }] })
  const outsider = user('out', { roles: [{ name: 'viewer', title: 'Viewer' }] })
  const users = [swedish, german, admin, outsider]

  // Mirrors how KM derives locales from locale-* roles, with admins seeing every locale
  const localeByRole: Record<string, string[]> = {
    'locale-sv-se': ['sv-SE'],
    'locale-de-de': ['de-DE'],
    administrator: ['sv-SE', 'de-DE']
  }
  const filters: WorkflowConfig['filters'] = currentUser => ({
    locales: (currentUser?.roles ?? []).flatMap(role => localeByRole[role.name] ?? [])
  })

  function assignable(options: Partial<Parameters<typeof getAssignableUsers>[1]> = {}) {
    return getAssignableUsers(users, {
      states,
      filters,
      locale: 'sv-SE',
      assignees: [],
      ...options
    }).map(u => u.id)
  }

  it('keeps users with a State role who work in the document locale', () => {
    expect(assignable()).toEqual(['sv', 'admin'])
  })

  it('ignores locales when the document has none', () => {
    expect(assignable({ locale: null })).toEqual(['sv', 'de', 'admin'])
  })

  it('ignores locales when the plugin has no filters config', () => {
    expect(assignable({ filters: undefined })).toEqual(['sv', 'de', 'admin'])
  })

  it('keeps current assignees so they can be removed', () => {
    expect(assignable({ assignees: ['out'] })).toEqual(['sv', 'admin', 'out'])
  })
})
