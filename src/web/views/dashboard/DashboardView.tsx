import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import React from 'react'
import { FaPencil, FaPlus, FaTrash } from 'react-icons/fa6'

import { Dashboard, DashboardRow } from '../../../shared/models/Dashboard'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { useDialogs } from '../../components/DialogsContext'
import { Input } from '../../components/Input'
import { ViewContainer } from '../../components/ViewContainer'
import { DashboardRowDialog } from './DashboardRowDialog'
import { DashboardRowRenderer } from './rows'

export const DashboardView: React.FC = () => {
  const { openDialog } = useDialogs()
  const [timetravel, setTimetravel] = React.useState<string | undefined>(undefined)
  const queryClient = useQueryClient()
  const { data: dashboard } = useSuspenseQuery({
    queryKey: ['dashboard', 'default'],
    queryFn: () => rpcClient.retrieveDefaultDashboard().then(r => r.data),
  })
  const [editing, setEditing] = React.useState(false)
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
    <ViewContainer className={stylesRoot}>
      <div className={stylesToolbar}>
        <div />
        <Button onClick={() => setEditing(editing => !editing)}>Edit</Button>
        <Input
          type="date"
          value={timetravel || ''}
          onChange={event => setTimetravel(event.target.value || undefined)}
        />
      </div>
      {rowsAndAdders.map(rowOrAdder => {
        switch (rowOrAdder.type) {
          case 'adder': {
            return (
              editing && (
                <div key={`adder-${rowOrAdder.index}`} className={stylesRowAdd}>
                  <FaPlus
                    key={`adder-${rowOrAdder.index}`}
                    onClick={async () => {
                      await openDialog(DashboardRowDialog, {
                        row: {
                          type: 'headline',
                          content: 'New headline',
                        },
                        onChangeRow: async nextRow => {
                          const nextDashboard = {
                            ...dashboard,
                            rows: [
                              ...dashboard.rows.slice(0, rowOrAdder.index),
                              nextRow,
                              ...dashboard.rows.slice(rowOrAdder.index),
                            ],
                          } satisfies Dashboard
                          await rpcClient.updateDefaultDashboard(nextDashboard)
                          await queryClient.invalidateQueries()
                        },
                      })
                    }}
                    className={stylesAction}
                  />
                </div>
              )
            )
          }
          case 'row':
            return (
              <div key={`row-${rowOrAdder.index}`} className={clsx(editing && stylesRowEdit)}>
                {editing && (
                  <FaPencil
                    onClick={async () => {
                      await openDialog(DashboardRowDialog, {
                        row: rowOrAdder.row,
                        onChangeRow: async nextRow => {
                          const nextDashboard = {
                            ...dashboard,
                            rows: [
                              ...dashboard.rows.slice(0, rowOrAdder.index),
                              nextRow,
                              ...dashboard.rows.slice(rowOrAdder.index + 1),
                            ],
                          } satisfies Dashboard
                          await rpcClient.updateDefaultDashboard(nextDashboard)
                          await queryClient.invalidateQueries()
                        },
                      })
                    }}
                    className={stylesAction}
                  />
                )}
                <DashboardRowRenderer row={rowOrAdder.row} timetravel={timetravel} editing={editing} />
                {editing && (
                  <FaTrash
                    onClick={async () => {
                      const nextDashboard = {
                        ...dashboard,
                        rows: [
                          ...dashboard.rows.slice(0, rowOrAdder.index),
                          ...dashboard.rows.slice(rowOrAdder.index + 1),
                        ],
                      } satisfies Dashboard
                      await rpcClient.updateDefaultDashboard(nextDashboard)
                      await queryClient.invalidateQueries()
                    }}
                    className={stylesAction}
                  />
                )}
              </div>
            )
        }
      })}
    </ViewContainer>
  )
}

const stylesRoot = css`
  container-name: dashboard;
  container-type: inline-size;
`

const stylesToolbar = css`
  display: grid;
  gap: var(--spacing-large);
  grid-template-columns: 1fr auto auto;
`

const stylesRowAdd = css`
  display: grid;
`

const stylesRowEdit = css`
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  gap: var(--spacing-small);
`

const stylesAction = css`
  display: block;
  padding: 2px;
  cursor: pointer;
  align-self: center;
  justify-self: center;
`
