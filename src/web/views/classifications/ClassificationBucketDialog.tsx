import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { ClassificationBucket } from '../../../shared/models/Classification'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'

type Mode =
  | { type: 'create'; classificationId: string; parentBucketId: string | null }
  | { type: 'edit'; bucket: ClassificationBucket }

interface Props extends DialogContentProps<ClassificationBucket> {
  mode: Mode
}

export const ClassificationBucketDialog: React.FC<Props> = ({ mode, closeDialog }) => {
  const queryClient = useQueryClient()
  const [name, setName] = React.useState(mode.type === 'edit' ? mode.bucket.name : '')
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          if (mode.type === 'create') {
            const result = await rpcClient.createClassificationBucket({
              classificationId: mode.classificationId,
              parentBucketId: mode.parentBucketId,
              name,
              sortOrder: 0,
            })
            await queryClient.invalidateQueries()
            setState('done')
            closeDialog(result.data)
          } else {
            const result = await rpcClient.updateClassificationBucket({
              ...mode.bucket,
              name,
            })
            await queryClient.invalidateQueries()
            setState('done')
            closeDialog(result.data)
          }
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Name" htmlFor="name">
        <Input id="name" type="text" value={name} onChange={event => setName(event.target.value)} required autoFocus />
      </Label>
      <Button type="submit" variant="primary" busy={state === 'busy'} check={state === 'done'} disabled={!!state}>
        Save
      </Button>
      <Button type="reset" onClick={() => closeDialog(undefined)}>
        Cancel
      </Button>
    </Form>
  )
}
