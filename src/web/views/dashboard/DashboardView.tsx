import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import React from 'react'
import { FaPencil, FaPlus, FaTrash } from 'react-icons/fa6'

import { createEmptyDashboardElement, DashboardElement, DashboardRow } from '../../../shared/models/Dashboard'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { useDialogs } from '../../components/DialogsContext'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { Input } from '../../components/Input'
import { LoadingBox } from '../../components/LoadingBox'
import { ViewContainer } from '../../components/ViewContainer'
import { DashboardElementDialog } from './DashboardElementDialog'
import { DashboardElementRenderer } from './elements'

export const DashboardView: React.FC = () => {
  const [timetravel, setTimetravel] = React.useState<string | undefined>(undefined)
  const queryClient = useQueryClient()
  const { data: dashboard } = useSuspenseQuery({
    queryKey: ['dashboard', 'default'],
    queryFn: () => rpcClient.retrieveDefaultDashboard().then(r => r.data),
  })
  const [editing, setEditing] = React.useState(false)

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
      <Rows
        rows={dashboard.rows}
        onChangeRows={async nextRows => {
          const nextDashboard = { ...dashboard, rows: nextRows }
          await rpcClient.updateDefaultDashboard(nextDashboard)
          await queryClient.invalidateQueries()
        }}
        editing={editing}
        timetravel={timetravel}
      />
    </ViewContainer>
  )
}

type RowsProps = {
  rows: DashboardRow[]
  onChangeRows: (rows: DashboardRow[]) => Promise<void> | void
  editing: boolean
  timetravel?: string
}

const Rows: React.FC<RowsProps> = ({ rows, onChangeRows, editing, timetravel }) => {
  const { openDialog } = useDialogs()
  const rowsAndAdders = React.useMemo(() => {
    const result: ({ type: 'adder'; index: number } | { type: 'row'; index: number; row: DashboardRow })[] = []
    result.push({ type: 'adder', index: 0 })
    for (let i = 0; i < rows.length; i++) {
      result.push({ type: 'row', index: i, row: rows[i] })
      result.push({ type: 'adder', index: i + 1 })
    }
    return result
  }, [rows])

  return (
    <div className={!editing ? stylesRows : stylesRowsEditing}>
      {rowsAndAdders.map(rowOrAdder => {
        switch (rowOrAdder.type) {
          case 'adder': {
            return (
              editing && (
                <div key={`row-adder-${rowOrAdder.index}`}>
                  <FaPlus
                    key={`adder-${rowOrAdder.index}`}
                    onClick={async event => {
                      event.preventDefault()
                      event.stopPropagation()
                      await openDialog(DashboardElementDialog, {
                        element: createEmptyDashboardElement(),
                        onChangeElement: async nextElement => {
                          const nextRow = {
                            columns: [nextElement],
                          } satisfies DashboardRow
                          onChangeRows([...rows.slice(0, rowOrAdder.index), nextRow, ...rows.slice(rowOrAdder.index)])
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
              <div key={`row-${rowOrAdder.index}`}>
                <Columns
                  columns={rowOrAdder.row.columns}
                  onChangeColumns={async nextColumns => {
                    if (nextColumns.length > 0) {
                      const nextRow = {
                        ...rowOrAdder.row,
                        columns: nextColumns,
                      }
                      onChangeRows([...rows.slice(0, rowOrAdder.index), nextRow, ...rows.slice(rowOrAdder.index + 1)])
                    } else {
                      onChangeRows([...rows.slice(0, rowOrAdder.index), ...rows.slice(rowOrAdder.index + 1)])
                    }
                  }}
                  editing={editing}
                  timetravel={timetravel}
                />
              </div>
            )
        }
      })}
    </div>
  )
}

type ColumnsProps = {
  columns: DashboardElement[]
  onChangeColumns: (columns: DashboardElement[]) => Promise<void> | void
  editing: boolean
  timetravel?: string
}

const Columns: React.FC<ColumnsProps> = ({ columns, onChangeColumns, editing, timetravel }) => {
  const { openDialog } = useDialogs()
  const columnsAndAdders = React.useMemo(() => {
    const result: ({ type: 'adder'; index: number } | { type: 'column'; index: number; column: DashboardElement })[] =
      []
    if (editing) {
      result.push({ type: 'adder', index: 0 })
    }
    for (let i = 0; i < columns.length; i++) {
      result.push({ type: 'column', index: i, column: columns[i] })
      if (editing) {
        result.push({ type: 'adder', index: i + 1 })
      }
    }
    return result
  }, [columns, editing])
  return (
    <div className={stylesRoot}>
      <div
        className={clsx(
          !editing ? stylesColumns : stylesColumnsEditing,
          !editing ? stylesGridLength[columns.length - 1] : stylesGridEditingLength[columns.length - 1]
        )}
      >
        {columnsAndAdders.map(columnOrAdder => {
          switch (columnOrAdder.type) {
            case 'adder':
              return (
                <FaPlus
                  key={`column-adder-${columnOrAdder.index}`}
                  onClick={async event => {
                    event.preventDefault()
                    event.stopPropagation()
                    await openDialog(DashboardElementDialog, {
                      element: createEmptyDashboardElement(),
                      onChangeElement: async nextElement => {
                        onChangeColumns([
                          ...columns.slice(0, columnOrAdder.index),
                          nextElement,
                          ...columns.slice(columnOrAdder.index),
                        ])
                      },
                    })
                  }}
                  className={stylesAction}
                />
              )
            case 'column':
              return (
                <React.Suspense key={`column-${columnOrAdder.index}`} fallback={<LoadingBox />}>
                  <div className={stylesElement}>
                    {editing && (
                      <div className={stylesElementEdit}>
                        <FaPencil
                          onClick={async event => {
                            event.preventDefault()
                            event.stopPropagation()
                            openDialog(DashboardElementDialog, {
                              element: columnOrAdder.column,
                              onChangeElement: async nextElement => {
                                onChangeColumns([
                                  ...columns.slice(0, columnOrAdder.index),
                                  nextElement,
                                  ...columns.slice(columnOrAdder.index + 1),
                                ])
                              },
                            })
                          }}
                          className={stylesAction}
                        />
                        <FaTrash
                          onClick={async event => {
                            event.preventDefault()
                            event.stopPropagation()
                            onChangeColumns([
                              ...columns.slice(0, columnOrAdder.index),
                              ...columns.slice(columnOrAdder.index + 1),
                            ])
                          }}
                          className={stylesAction}
                        />
                      </div>
                    )}
                    <ErrorBoundary
                      renderError={() => (
                        <LoadingBox>
                          <div>Error</div>
                        </LoadingBox>
                      )}
                    >
                      <DashboardElementRenderer element={columnOrAdder.column} timetravel={timetravel} />
                    </ErrorBoundary>
                  </div>
                </React.Suspense>
              )
          }
        })}
      </div>
    </div>
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

const stylesRows = css`
  display: grid;
  gap: var(--spacing-large);
`

const stylesRowsEditing = css`
  display: grid;
  gap: 2px;
`

const stylesColumns = css`
  display: grid;
  gap: var(--spacing-large);
`

const stylesColumnsEditing = css`
  display: grid;
  gap: 2px;
`

const stylesGridLength = [
  css`
    grid-template-columns: repeat(1, 1fr);
  `,
  css`
    grid-template-columns: repeat(2, 1fr);

    @container dashboard (width < 600px) {
      grid-template-columns: repeat(1, 1fr);
    }
  `,
  css`
    grid-template-columns: repeat(3, 1fr);

    @container dashboard (width < 900px) {
      grid-template-columns: repeat(1, 1fr);
    }
  `,
  css`
    grid-template-columns: repeat(4, 1fr);

    @container dashboard (width < 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @container dashboard (width < 600px) {
      grid-template-columns: repeat(1, 1fr);
    }
  `,
]

const stylesGridEditingLength = [
  css`
    grid-template-columns: auto repeat(1, 1fr auto);
  `,
  css`
    grid-template-columns: auto repeat(2, 1fr auto);
  `,
  css`
    grid-template-columns: auto repeat(3, 1fr auto);
  `,
  css`
    grid-template-columns: auto repeat(4, 1fr auto);
  `,
]

const stylesElement = css`
  position: relative;
  display: grid;

  & > * {
    position: relative;
    display: grid;
    overflow: hidden;
  }
`

const stylesElementEdit = css`
  position: absolute;
  z-index: 1;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-small);
  padding: var(--spacing-small);
`

const stylesAction = css`
  display: block;
  padding: var(--spacing-small);
  cursor: pointer;
  align-self: center;
  justify-self: center;
  background-color: var(--color-neutral);
  border-radius: var(--border-radius-small);
`
