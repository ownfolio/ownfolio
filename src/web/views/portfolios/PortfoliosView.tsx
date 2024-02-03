import { css } from '@linaria/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'

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
  const portfolios = useQuery(['portfolios'], () => rpcClient.listPortfolios({})).data!

  const columns = React.useMemo<TableDefinitionColumn[]>(() => [{ id: 'name', title: 'Name', minWidth: 200 }], [])

  const rows = React.useMemo<TableDefinitionRow[]>(
    () =>
      portfolios.map(portfolio => {
        return {
          id: portfolio.id,
          columns: {
            name: portfolio.name,
          },
          menuItems: [
            {
              label: 'Edit',
              onClick: async () => {
                await openDialog(PortfolioDialog, { mode: { type: 'edit', portfolioId: portfolio.id } })
              },
            },
            null,
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
          ],
        }
      }),
    [portfolios]
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
    </ViewContainer>
  )
}

const stylesToolbar = css`
  display: grid;
  grid-gap: var(--spacing-large);
  grid-template-columns: 1fr;
`
