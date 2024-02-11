import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { Account, createEmptyAccount } from '../../../shared/models/Account'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { SelectCurrency } from '../../components/SelectCurrency'
import { SelectPortfolio } from '../../components/SelectPortfolio'
import { LoadingView } from '../loading/LoadingView'

type Mode =
  | { type: 'create'; accountTemplate?: Omit<Account, 'id' | 'createdAt'> }
  | { type: 'edit'; accountId: string }

interface Props extends DialogContentProps<Account> {
  mode: Mode
}

export const AccountDialog: React.FC<Props> = ({ mode, closeDialog }) => {
  const queryClient = useQueryClient()
  const [account, setAccount] = React.useState<Account | undefined>(undefined)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  React.useEffect(() => {
    if (mode.type === 'create') {
      setAccount({
        ...createEmptyAccount(),
        ...mode.accountTemplate,
      })
    } else {
      rpcClient
        .retrieveAccount({ id: mode.accountId })
        .then(r => r.data)
        .then(setAccount)
        .catch(err => {
          closeDialog(undefined)
          Promise.reject(err)
        })
    }
  }, [])
  if (!account) {
    return <LoadingView />
  }

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          if (mode.type === 'create') {
            await rpcClient.createAccount(account)
          } else {
            await rpcClient.updateAccount(account)
          }
          await queryClient.invalidateQueries()
          setState('done')
          closeDialog(undefined)
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Portfolio ID" htmlFor="portfolioId">
        <SelectPortfolio
          id="portfolioId"
          value={account.portfolioId}
          onChange={event => setAccount(account => ({ ...account!, portfolioId: event.target.value }))}
          required
          autoFocus
        />
      </Label>
      <Label text="Name" htmlFor="name">
        <Input
          id="name"
          type="text"
          value={account.name}
          onChange={event => setAccount(account => ({ ...account!, name: event.target.value }))}
          required
        />
      </Label>
      <Label text="Number" htmlFor="number">
        <Input
          id="number"
          type="text"
          value={account.number}
          onChange={event => setAccount(account => ({ ...account!, number: event.target.value }))}
        />
      </Label>
      <Label text="Currency" htmlFor="currency">
        <SelectCurrency
          id="currency"
          value={account.currency}
          onChange={event => setAccount(account => ({ ...account!, currency: event.target.value }))}
          required
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
