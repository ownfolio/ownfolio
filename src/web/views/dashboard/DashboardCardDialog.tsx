import React from 'react'

import { Account } from '../../../shared/models/Account'
import { createEmptyDashboardCard, DashboardCard, DashboardCardType } from '../../../shared/models/Dashboard'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Label } from '../../components/Label'
import { SelectDashboardCardType } from '../../components/SelectDashboardCardType'
import { DashboardCardFields } from './cards'

interface Props extends DialogContentProps<Account> {
  card: DashboardCard
  onChangeCard: (card: DashboardCard) => Promise<void> | void
}

export const DashboardCardDialog: React.FC<Props> = ({ card: _card, onChangeCard, closeDialog }) => {
  const [card, setCard] = React.useState(_card)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          await onChangeCard(card)
          setState('done')
          closeDialog(undefined)
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Type" htmlFor="type">
        <SelectDashboardCardType
          id="type"
          value={card.type}
          onChange={event => setCard(createEmptyDashboardCard(event.target.value as DashboardCardType))}
          required
          autoFocus
        />
      </Label>
      <DashboardCardFields card={card} onChangeCard={setCard} />
      <Button type="submit" variant="primary" busy={state === 'busy'} check={state === 'done'} disabled={!!state}>
        Save
      </Button>
      <Button type="reset" onClick={() => closeDialog(undefined)}>
        Cancel
      </Button>
    </Form>
  )
}
