import type { CurrentUser, SanityDocumentLike } from 'sanity'

export type State = {
  id: string
  transitions?: string[]
  title: string
  roles?: string[]
  requireAssignment?: boolean
  requireValidation?: boolean
  // From document badges
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

export type StateCheck<Id, States> = {
  id: Id
  // Transitions is an array of State ids
  transitions?: States extends { id: infer Id2 }[] ? Id2[] : never
} & State

export type FilterOptions = {
  locales: string[]
}

export type Language = {
  id: string
  title: string
}

export type WorkflowConfig = {
  schemaTypes: string[]
  states?: State[]
  filters?: (user: CurrentUser | null) => FilterOptions | undefined
  /** Display names for locales, in document-internationalization's `supportedLanguages` shape */
  languages?: Language[]
}

export function defineStates<Id extends string, States extends StateCheck<Id, States>[]>(
  states: States
): States {
  return states
}

export type Metadata = SanityDocumentLike & {
  _rev: string
  assignees: string[] | null
  documentId: string
  draftDocumentId?: string
  draftUpdatedAt?: string | null
  publishedUpdatedAt?: string | null
  state: string | null
  orderRank: string | null
  locale: string | null
}

export type KeyedMetadata = Partial<Record<string, Metadata>>

export type SanityDocumentWithMetadata = {
  _metadata: Metadata
  _id: string
  _type: string
  _rev: string
  _updatedAt: string
}
