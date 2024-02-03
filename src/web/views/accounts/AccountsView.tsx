import { css } from '@linaria/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { filterNotFalse } from '../../../shared/utils/array'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDialogs } from '../../components/DialogsContext'
import { ViewContainer } from '../../components/ViewContainer'
import { AccountDialog } from './AccountDialog'

export const AccountsView: React.FC = () => {
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const portfolios = useQuery(['portfolios'], () => rpcClient.listPortfolios({})).data!
  const accounts = useQuery(['accounts'], () => rpcClient.listAccounts({})).data!
  const [showHidden, setShowHidden] = React.useState(false)

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'portfolio', title: 'Porfolio', minWidth: 200, priority: 2 },
      { id: 'name', title: 'Name', minWidth: 200 },
      { id: 'number', title: 'Number', width: 200, priority: 1, className: stylesNumberColumn },
      { id: 'currency', title: 'Currency', align: 'right', width: 150, priority: 3 },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(
    () =>
      accounts
        .filter(a => showHidden || a.status !== 'hidden')
        .map(account => {
          const portfolio = portfolios.find(p => p.id === account.portfolioId)
          return {
            id: account.id,
            columns: {
              portfolio: portfolio?.name || '???',
              name: account.name,
              number: account.number,
              currency: account.currency,
            },
            menuItems: filterNotFalse([
              {
                label: 'Edit',
                onClick: async () => {
                  await openDialog(AccountDialog, { mode: { type: 'edit', accountId: account.id } })
                },
              },
              null,
              account.status === 'active' && {
                label: 'Deactivate',
                onClick: async () => {
                  await rpcClient.updateAccountStatus({ id: account.id, status: 'inactive' })
                  await queryClient.invalidateQueries()
                },
              },
              account.status === 'inactive' && {
                label: 'Activate',
                onClick: async () => {
                  await rpcClient.updateAccountStatus({ id: account.id, status: 'active' })
                  await queryClient.invalidateQueries()
                },
              },
              account.status === 'inactive' && {
                label: 'Hide',
                onClick: async () => {
                  await rpcClient.updateAccountStatus({ id: account.id, status: 'hidden' })
                  await queryClient.invalidateQueries()
                },
              },
              account.status === 'hidden' && {
                label: 'Unhide',
                onClick: async () => {
                  await rpcClient.updateAccountStatus({ id: account.id, status: 'inactive' })
                  await queryClient.invalidateQueries()
                },
              },
              {
                label: 'Delete',
                onClick: async () => {
                  const result = await openDialog(ConfirmationDialog, {
                    question: `Sure that you want to delete the account ${account.name}? This cannot be undone.`,
                    yesText: `Yes, delete ${account.name}!`,
                  })
                  if (result) {
                    await rpcClient.deleteAccount({ id: account.id })
                    await queryClient.invalidateQueries()
                  }
                },
              },
            ]),
          }
        }),
    [accounts, portfolios, showHidden]
  )

  return (
    <ViewContainer>
      <div className={stylesToolbar}>
        <Button
          variant="primary"
          onClick={async () => {
            await openDialog(AccountDialog, { mode: { type: 'create' } })
          }}
        >
          Create
        </Button>
      </div>
      <CardTable columns={columns} rows={rows} />
      {!!accounts.find(a => a.status === 'hidden') && (
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

const stylesNumberColumn = css`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: wrap;
`
