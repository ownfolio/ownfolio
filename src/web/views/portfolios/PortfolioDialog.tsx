import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { createEmptyPortfolio, Portfolio } from '../../../shared/models/Portfolio'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { LoadingView } from '../loading/LoadingView'

type Mode =
  | { type: 'create'; portfolioTemplate?: Omit<Portfolio, 'id' | 'createdAt'> }
  | { type: 'edit'; portfolioId: string }

interface Props extends DialogContentProps<Portfolio> {
  mode: Mode
}

export const PortfolioDialog: React.FC<Props> = ({ mode, closeDialog }) => {
  const queryClient = useQueryClient()
  const [portfolio, setPortfolio] = React.useState<Portfolio | undefined>(undefined)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  React.useEffect(() => {
    if (mode.type === 'create') {
      setPortfolio({
        ...createEmptyPortfolio(),
        ...mode.portfolioTemplate,
      })
    } else {
      rpcClient
        .retrievePortfolio({ id: mode.portfolioId })
        .then(r => r.data)
        .then(setPortfolio)
        .catch(err => {
          closeDialog(undefined)
          Promise.reject(err)
        })
    }
  }, [])
  if (!portfolio) {
    return <LoadingView />
  }

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          if (mode.type === 'create') {
            await rpcClient.createPortfolio(portfolio)
          } else {
            await rpcClient.updatePortfolio(portfolio)
          }
          await queryClient.invalidateQueries()
          setState('done')
          closeDialog(undefined)
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Name" htmlFor="name">
        <Input
          id="name"
          value={portfolio.name}
          onChange={event => setPortfolio(portfolio => ({ ...portfolio!, name: event.target.value }))}
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
