import { useFormValue } from 'sanity'

import { Card } from '@sanity/ui'

import UserAssignment from './UserAssignment'

import type { FunctionComponent } from 'react'
import type { ArrayOfPrimitivesInputProps, ArraySchemaType } from 'sanity'

const UserAssignmentInput: FunctionComponent<
  ArrayOfPrimitivesInputProps<string | number | boolean, ArraySchemaType>
> = props => {
  const documentId = useFormValue([`documentId`])
  const locale = useFormValue([`locale`])

  const stringValue =
    Array.isArray(props?.value) && props?.value?.length ? props.value.map(item => String(item)) : []

  return (
    <Card border padding={1}>
      <UserAssignment
        assignees={stringValue}
        documentId={String(documentId)}
        locale={typeof locale === 'string' ? locale : null}
      />
    </Card>
  )
}

export default UserAssignmentInput
