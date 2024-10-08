import {CurrentUser} from 'sanity'
import {Plugin as Plugin_2} from 'sanity'

declare type FilterOptions = {
  locales: string[]
}

declare type State = {
  id: string
  transitions: string[]
  title: string
  roles?: string[]
  requireAssignment?: boolean
  requireValidation?: boolean
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

export declare const workflow: Plugin_2<WorkflowConfig>

declare type WorkflowConfig = {
  schemaTypes: string[]
  states?: State[]
  filters?: (user: CurrentUser | null) => FilterOptions | undefined
}

export {}
