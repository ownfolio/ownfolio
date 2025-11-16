import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { filterNotFalse } from '../../../shared/utils/array'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDialogs } from '../../components/DialogsContext'
import { ViewContainer } from '../../components/ViewContainer'
import { PortfolioDialog } from './PortfolioDialog'

export const PortfoliosView: React.FC = () => {
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const { data: portfolios } = useSuspenseQuery({
    queryKey: ['portfolios'],
    queryFn: () => rpcClient.listPortfolios({}).then(r => r.data),
  })
  const [showHidden, setShowHidden] = React.useState(false)

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'name', title: 'Name', minWidth: 200 },
      { id: 'status', title: 'Status', align: 'right', width: 150, priority: 1 },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(
    () =>
      portfolios
        .filter(p => showHidden || p.status !== 'hidden')
        .map(portfolio => {
          return {
            id: portfolio.id,
            columns: {
              name: portfolio.name,
              status: portfolio.status,
            },
            menuItems: filterNotFalse([
              {
                label: 'Edit',
                onClick: async () => {
                  await openDialog(PortfolioDialog, { mode: { type: 'edit', portfolioId: portfolio.id } })
                },
              },
              null,
              portfolio.status === 'active' && {
                label: 'Deactivate',
                onClick: async () => {
                  await rpcClient.updatePortfolioStatus({ id: portfolio.id, status: 'inactive' })
                  await queryClient.invalidateQueries()
                },
              },
              portfolio.status === 'inactive' && {
                label: 'Activate',
                onClick: async () => {
                  await rpcClient.updatePortfolioStatus({ id: portfolio.id, status: 'active' })
                  await queryClient.invalidateQueries()
                },
              },
              portfolio.status === 'inactive' && {
                label: 'Hide',
                onClick: async () => {
                  await rpcClient.updatePortfolioStatus({ id: portfolio.id, status: 'hidden' })
                  await queryClient.invalidateQueries()
                },
              },
              portfolio.status === 'hidden' && {
                label: 'Unhide',
                onClick: async () => {
                  await rpcClient.updatePortfolioStatus({ id: portfolio.id, status: 'inactive' })
                  await queryClient.invalidateQueries()
                },
              },
              {
                label: 'Delete',
                onClick: async () => {
                  const result = await openDialog(ConfirmationDialog, {
                    question: `Sure that you want to delete the portfolio ${portfolio.name}? This cannot be undone.`,
                    yesText: `Yes, delete ${portfolio.name}!`,
                  })
                  if (result) {
                    await rpcClient.deletePortfolio({ id: portfolio.id })
                    await queryClient.invalidateQueries()
                  }
                },
              },
            ]),
          }
        }),
    [portfolios, showHidden]
  )

  return (
    <ViewContainer>
      <div className={stylesToolbar}>
        <Button
          variant="primary"
          onClick={async () => {
            await openDialog(PortfolioDialog, { mode: { type: 'create' } })
          }}
        >
          Create
        </Button>
      </div>
      <CardTable columns={columns} rows={rows} />
      {!!portfolios.find(p => p.status === 'hidden') && (
        <a
          href="#"
          onClick={event => {
            event.preventDefault()
            setShowHidden(showHidden => !showHidden)
          }}
        >
          {!showHidden ? 'Show hidden' : 'Hide hidden'}
        </a>
      )}
    </ViewContainer>
  )
}

const stylesToolbar = css`
  display: grid;
  grid-gap: var(--spacing-large);
  grid-template-columns: 1fr;
`
