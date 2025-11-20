import React from 'react'

import { Account } from '../../../shared/models/Account'
import { createEmptyDashboardElement, DashboardElement, DashboardElementType } from '../../../shared/models/Dashboard'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Label } from '../../components/Label'
import { SelectDashboardElementType } from '../../components/SelectDashboardElementType'
import { DashboardElementFieldsRenderer } from './elements'

interface Props extends DialogContentProps<Account> {
  element: DashboardElement
  onChangeElement: (element: DashboardElement) => Promise<void> | void
}

export const DashboardElementDialog: React.FC<Props> = ({ element: _element, onChangeElement, closeDialog }) => {
  const [element, setElement] = React.useState(_element)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          await onChangeElement(element)
          setState('done')
          closeDialog(undefined)
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Type" htmlFor="type">
        <SelectDashboardElementType
          id="type"
          value={element.type}
          onChange={event => setElement(createEmptyDashboardElement(event.target.value as DashboardElementType))}
          required
          autoFocus
        />
      </Label>
      <DashboardElementFieldsRenderer element={element} onChangeElement={setElement} />
      <Button type="submit" variant="primary" busy={state === 'busy'} check={state === 'done'} disabled={!!state}>
        Save
      </Button>
      <Button type="reset" onClick={() => closeDialog(undefined)}>
        Cancel
      </Button>
    </Form>
  )
}
