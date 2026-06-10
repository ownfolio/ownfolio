import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { filterNotFalse } from '../../../shared/utils/array'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { useDialogs } from '../../components/DialogsContext'
import { ViewContainer } from '../../components/ViewContainer'
import { ClassificationDialog } from './ClassificationDialog'

export const ClassificationsView: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()

  const { data: classifications } = useSuspenseQuery({
    queryKey: ['classifications'],
    queryFn: () => rpcClient.listClassifications().then(r => r.data),
  })

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'name', title: 'Name', minWidth: 250 },
      { id: 'status', title: 'Status', align: 'right', width: 150, priority: 2 },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(
    () =>
      classifications.map(classification => ({
        id: classification.id,
        columns: {
          name: (
            <a
              href="#"
              onClick={event => {
                event.preventDefault()
                navigate(`/classifications/${classification.id}`)
              }}
            >
              {classification.name}
            </a>
          ),
          status: classification.status,
        },
        menuItems: filterNotFalse([
          {
            label: 'Open',
            onClick: () => navigate(`/classifications/${classification.id}`),
          },
          null,
          {
            label: 'Edit',
            onClick: async () => {
              await openDialog(ClassificationDialog, { mode: { type: 'edit', classification } })
              await queryClient.invalidateQueries()
            },
          },
        ]),
      })),
    [classifications]
  )

  return (
    <ViewContainer>
      <div className={stylesToolbar}>
        <Button
          variant="primary"
          onClick={async () => {
            const result = await openDialog(ClassificationDialog, { mode: { type: 'create' } })
            if (result) {
              navigate(`/classifications/${result.id}`)
            }
          }}
        >
          Create
        </Button>
      </div>
      <CardTable columns={columns} rows={rows} />
    </ViewContainer>
  )
}

const stylesToolbar = css`
  display: grid;
  grid-gap: var(--spacing-large);
  grid-template-columns: 1fr;
`
