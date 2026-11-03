import { SplitVerticalIcon } from '@sanity/icons/SplitVertical'
import { useToast } from '@sanity/ui/toast'
import { useCallback, useState } from 'react'
import { useClient } from 'sanity'
import type { DocumentActionProps, DocumentActionDescription } from 'sanity'

import { useWorkflowContext } from '../components/WorkflowContext'
import { API_VERSION } from '../constants'
import { rankBetween } from '../helpers/ranking'

export function useBeginWorkflow({
  id,
  draft
}: DocumentActionProps): DocumentActionDescription | null {
  const { metadata, loading, error, states } = useWorkflowContext(id)
  const client = useClient({ apiVersion: API_VERSION })
  const toast = useToast()
  const [beginning, setBeginning] = useState(false)
  const [complete, setComplete] = useState(false)

  const handle = useCallback(async () => {
    setBeginning(true)

    try {
      const lowestOrderFirstState = await client.fetch(
        `*[_type == "workflow.metadata" && state == $state]|order(orderRank)[0].orderRank`,
        { state: states?.[0]?.id }
      )

      await client.createIfNotExists({
        _id: `workflow-metadata.${id}`,
        _type: `workflow.metadata`,
        documentId: id,
        state: states?.[0]?.id,
        orderRank: rankBetween(null, lowestOrderFirstState),
        locale: draft?.locale
      })

      toast.push({
        status: 'success',
        title: 'Workflow started',
        description: `Document is now "${states?.[0]?.title}"`
      })

      // Optimistically remove action
      setComplete(true)
    } catch (err) {
      console.error(err)

      toast.push({
        status: 'error',
        title: 'Could not start Workflow'
      })
    } finally {
      setBeginning(false)
    }
  }, [id, states, client, toast, draft])

  if (!draft || complete || metadata) {
    return null
  }

  return {
    icon: SplitVerticalIcon,
    disabled: loading || Boolean(error) || beginning,
    label: beginning ? `Beginning...` : `Begin Workflow`,
    onHandle: handle
  }
}
