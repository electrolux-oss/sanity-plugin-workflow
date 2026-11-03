import { Card } from '@sanity/ui'
import type { FunctionComponent } from 'react'
import { useFormValue } from 'sanity'
import type { ArrayOfPrimitivesInputProps } from 'sanity'

import UserAssignment from './UserAssignment'

const UserAssignmentInput: FunctionComponent<ArrayOfPrimitivesInputProps> = props => {
  const documentId = useFormValue([`documentId`])
  const localeValue = useFormValue([`locale`])
  const locale = typeof localeValue === 'string' ? localeValue : undefined

  const stringValue =
    Array.isArray(props?.value) && props?.value?.length ? props.value.map(item => String(item)) : []

  return (
    <Card border padding={1}>
      <UserAssignment assignees={stringValue} documentId={String(documentId)} locale={locale} />
    </Card>
  )
}

export default UserAssignmentInput
