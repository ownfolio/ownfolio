import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { Classification } from '../../../shared/models/Classification'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { DialogContentProps, useDialogs } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'

type Mode = { type: 'create' } | { type: 'edit'; classification: Classification }

interface Props extends DialogContentProps<Classification> {
  mode: Mode
}

export const ClassificationDialog: React.FC<Props> = ({ mode, closeDialog }) => {
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const [name, setName] = React.useState(mode.type === 'edit' ? mode.classification.name : '')
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          if (mode.type === 'create') {
            const result = await rpcClient.createClassification({ name })
            await queryClient.invalidateQueries()
            setState('done')
            closeDialog(result.data)
          } else {
            const result = await rpcClient.updateClassification({
              id: mode.classification.id,
              name,
              status: mode.classification.status,
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
      {mode.type === 'edit' && (
        <Button
          type="button"
          onClick={async () => {
            const confirmed = await openDialog(ConfirmationDialog, {
              question: `Sure you want to delete the classification "${mode.classification.name}"? All buckets and assignments will be removed. This cannot be undone.`,
              yesText: `Yes, delete "${mode.classification.name}"!`,
            })
            if (confirmed) {
              await rpcClient.deleteClassification({ id: mode.classification.id })
              await queryClient.invalidateQueries()
              closeDialog(undefined)
            }
          }}
        >
          Delete
        </Button>
      )}
      <Button type="submit" variant="primary" busy={state === 'busy'} check={state === 'done'} disabled={!!state}>
        Save
      </Button>
      <Button type="reset" onClick={() => closeDialog(undefined)}>
        Cancel
      </Button>
    </Form>
  )
}
