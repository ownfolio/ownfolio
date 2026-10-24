import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { Categorization, createEmptyCategorization } from '../../../shared/models/Categorization'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { LoadingView } from '../loading/LoadingView'

type Mode = { type: 'create' } | { type: 'edit'; categorizationId: string }

interface Props extends DialogContentProps<Categorization> {
  mode: Mode
}

export const CategorizationDialog: React.FC<Props> = ({ mode, closeDialog }) => {
  const queryClient = useQueryClient()
  const [categorization, setCategorization] = React.useState<Categorization | undefined>(undefined)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  React.useEffect(() => {
    if (mode.type === 'create') {
      setCategorization(createEmptyCategorization())
    } else {
      rpcClient
        .retrieveCategorization({ id: mode.categorizationId })
        .then(r => r.data)
        .then(setCategorization)
        .catch(err => {
          closeDialog(undefined)
          Promise.reject(err)
        })
    }
  }, [])
  if (!categorization) {
    return <LoadingView />
  }

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          const result =
            mode.type === 'create'
              ? await rpcClient.createCategorization(categorization)
              : await rpcClient.updateCategorization(categorization)
          await queryClient.invalidateQueries()
          setState('done')
          closeDialog(result.data)
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Name" htmlFor="name">
        <Input
          id="name"
          value={categorization.name}
          onChange={event => setCategorization(categorization => ({ ...categorization!, name: event.target.value }))}
          required
          autoFocus
        />
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
