import React from 'react'

import { Account } from '../../../shared/models/Account'
import { createEmptyDashboardRow, DashboardRow, DashboardRowType } from '../../../shared/models/Dashboard'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Label } from '../../components/Label'
import { SelectDashboardRowType } from '../../components/SelectDashboardRowType'
import { DashboardRowFields } from './rows'

interface Props extends DialogContentProps<Account> {
  row: DashboardRow
  onChangeRow: (row: DashboardRow) => Promise<void> | void
}

export const DashboardRowDialog: React.FC<Props> = ({ row: _row, onChangeRow, closeDialog }) => {
  const [row, setRow] = React.useState(_row)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)
  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          await onChangeRow(row)
          setState('done')
          closeDialog(undefined)
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Type">
        <SelectDashboardRowType
          value={row.type}
          onChange={event => setRow(createEmptyDashboardRow(event.target.value as DashboardRowType))}
        />
      </Label>
      <DashboardRowFields row={row} onChangeRow={setRow} />
      <Button type="submit" variant="primary" busy={state === 'busy'} check={state === 'done'} disabled={!!state}>
        Save
      </Button>
      <Button type="reset" onClick={() => closeDialog(undefined)}>
        Cancel
      </Button>
    </Form>
  )
}
