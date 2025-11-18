import { css } from '@linaria/core'
import React from 'react'
import { FaPlus } from 'react-icons/fa6'

import { Account } from '../../../shared/models/Account'
import { createEmptyDashboardRow, Dashboard, DashboardRow, DashboardRowType } from '../../../shared/models/Dashboard'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Label } from '../../components/Label'
import { SelectDashboardRowType } from '../../components/SelectDashboardRowType'
import { DashboardRowFields } from './rows'

interface Props extends DialogContentProps<Account> {
  dashboard: Dashboard
  onChangeDashboard: (dashboard: Dashboard) => Promise<void> | void
}

export const DashboardDialog: React.FC<Props> = ({ dashboard: _dashboard, onChangeDashboard, closeDialog }) => {
  const [dashboard, setDashboard] = React.useState(_dashboard)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  const rowsAndAdders = React.useMemo(() => {
    const result: ({ type: 'adder'; index: number } | { type: 'row'; index: number; row: DashboardRow })[] = []
    result.push({ type: 'adder', index: 0 })
    for (let i = 0; i < dashboard.rows.length; i++) {
      result.push({ type: 'row', index: i, row: dashboard.rows[i] })
      result.push({ type: 'adder', index: i + 1 })
    }
    return result
  }, [dashboard.rows])

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          await onChangeDashboard(dashboard)
          setState('done')
          closeDialog(undefined)
        } finally {
          setState(undefined)
        }
      }}
      className={stylesRoot}
    >
      {rowsAndAdders.map(rowOrAdder => {
        switch (rowOrAdder.type) {
          case 'adder':
            return (
              <Button
                key={`adder-${rowOrAdder.index}`}
                type="button"
                onClick={() => {
                  setDashboard(dashboard => ({
                    ...dashboard,
                    rows: [
                      ...dashboard.rows.slice(0, rowOrAdder.index),
                      {
                        type: 'headline',
                        content: 'Headline',
                      },
                      ...dashboard.rows.slice(rowOrAdder.index),
                    ],
                  }))
                }}
              >
                <FaPlus />
              </Button>
            )
          case 'row':
            return (
              <div key={`row-${rowOrAdder.index}`} className={stylesRow}>
                <Label text="Type" htmlFor={`row-${rowOrAdder.index}-type`}>
                  <SelectDashboardRowType
                    id={`row-${rowOrAdder.index}-type`}
                    value={rowOrAdder.row.type}
                    onChange={event =>
                      setDashboard(dashboard => ({
                        ...dashboard,
                        rows: [
                          ...dashboard.rows.slice(0, rowOrAdder.index),
                          createEmptyDashboardRow(event.target.value as DashboardRowType),
                          ...dashboard.rows.slice(rowOrAdder.index + 1),
                        ],
                      }))
                    }
                  />
                </Label>
                <DashboardRowFields
                  row={rowOrAdder.row}
                  onChangeRow={nextRow => {
                    setDashboard(dashboard => ({
                      ...dashboard,
                      rows: [
                        ...dashboard.rows.slice(0, rowOrAdder.index),
                        nextRow,
                        ...dashboard.rows.slice(rowOrAdder.index + 1),
                      ],
                    }))
                  }}
                />
              </div>
            )
        }
      })}
      <Button type="submit" variant="primary" busy={state === 'busy'} check={state === 'done'} disabled={!!state}>
        Save
      </Button>
      <Button type="reset" onClick={() => closeDialog(undefined)}>
        Cancel
      </Button>
    </Form>
  )
}

const stylesRoot = css`
  min-width: 400px;
`

const stylesRow = css`
  border-radius: var(--border-radius-small);
  border: 1px solid var(--color-neutral-dark);
  padding: var(--spacing-medium);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
`
