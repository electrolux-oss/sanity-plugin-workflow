import {Card} from '@sanity/ui'
import {FunctionComponent} from 'react'
import {
  ArrayOfPrimitivesInputProps,
  ArraySchemaType,
  useFormValue,
} from 'sanity'

import {API_VERSION} from '../constants'
import {useProjectUsers} from '../hooks/useUsers'
import UserAssignment from './UserAssignment'

const UserAssignmentInput: FunctionComponent<
  ArrayOfPrimitivesInputProps<string | number | boolean, ArraySchemaType>
> = (props) => {
  const documentId = useFormValue([`documentId`])
  const userList = useProjectUsers({apiVersion: API_VERSION})

  const stringValue =
    Array.isArray(props?.value) && props?.value?.length
      ? props.value.map((item) => String(item))
      : []

  return (
    <Card border padding={1}>
      <UserAssignment
        userList={userList}
        assignees={stringValue}
        documentId={String(documentId)}
      />
    </Card>
  )
}

export default UserAssignmentInput
