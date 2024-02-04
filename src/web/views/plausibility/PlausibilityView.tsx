import { css } from '@linaria/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import React from 'react'
import { BiSolidCommentError, BiSolidError, BiSolidErrorAlt } from 'react-icons/bi'

import { renderTransactionAsString } from '../../../shared/models/Transaction'
import { rpcClient } from '../../api'
import { Amount } from '../../components/Amount'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { useDialogs } from '../../components/DialogsContext'
import { Menu } from '../../components/Menu'
import { Select } from '../../components/Select'
import { ViewContainer } from '../../components/ViewContainer'
import { TransactionDialog } from '../transactions/TransactionDialog'

export const PlausibilityView: React.FC = () => {
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const accounts = useQuery(['accounts'], () => rpcClient.listAccounts({}).then(r => r.data)).data!
  const assets = useQuery(['assets'], () => rpcClient.listAssets({}).then(r => r.data)).data!
  const transactions = useQuery(['transactions'], () => rpcClient.listTransactions({}).then(r => r.data)).data!
  const attachments = useQuery(['attachments'], () => rpcClient.listAttachments({}).then(r => r.data)).data!
  const plausibility = useQuery(['evaluatePlausibility'], () => rpcClient.evaluatePlausibility()).data!.data
  const [level, setLevel] = React.useState('')

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'level', title: '', width: 16 },
      { id: 'date', title: 'Date', align: 'left', width: 125 },
      { id: 'description', title: 'Description', minWidth: 250, className: stylesDescription },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(
    () =>
      plausibility
        .filter(entry => !level || entry.level === level)
        .map((entry, idx) => {
          return {
            id: idx,
            columns: {
              level: ((): React.ReactElement => {
                switch (entry.level) {
                  case 'info':
                    return <BiSolidCommentError className={clsx(stylesLevel, stylesLevelInfo)} />
                  case 'warning':
                    return <BiSolidError className={clsx(stylesLevel, stylesLevelWarning)} />
                  case 'error':
                    return <BiSolidErrorAlt className={clsx(stylesLevel, stylesLevelError)} />
                }
              })(),
              date: entry.date,
              description: ((): React.ReactElement => {
                switch (entry.type) {
                  case 'transactionHasNoAttachment': {
                    const transaction = transactions.find(tx => tx.id === entry.transactionId)
                    return (
                      <>
                        <span title={transaction && renderTransactionAsString(transaction, accounts, assets)}>
                          Transaction
                        </span>
                        <span> has no attachment</span>
                      </>
                    )
                  }
                  case 'transactionDataConflictsWithAttachmentContent': {
                    const transaction = transactions.find(tx => tx.id === entry.transactionId)
                    const attachment = attachments.find(a => a.id === entry.attachmentId)
                    return (
                      <>
                        <span title={transaction && renderTransactionAsString(transaction, accounts, assets)}>
                          Transaction
                        </span>
                        <span> data conflicts with linked </span>
                        <span title={attachment && attachment.fileName}>attachment</span>
                        <span> content</span>
                      </>
                    )
                  }
                  case 'transactionConsumesMoreAssetAmountThanAvailable': {
                    const transaction = transactions.find(tx => tx.id === entry.transactionId)
                    const account = accounts.find(tx => tx.id === entry.assetAccountId)
                    const asset = assets.find(tx => tx.id === entry.assetId)
                    return (
                      <>
                        <span title={transaction && renderTransactionAsString(transaction, accounts, assets)}>
                          Transaction
                        </span>
                        <span> consumes </span>
                        <Amount
                          amount={entry.excessiveAssetAmount}
                          denomination={asset?.denomination || 0}
                          symbol={asset?.symbol || '???'}
                        />
                        <span> more than available in account </span>
                        <span>{account?.name || '???'}</span>
                      </>
                    )
                  }
                }
              })(),
            },
            menuItems: ((): React.ComponentProps<typeof Menu>['items'] => {
              switch (entry.type) {
                case 'transactionHasNoAttachment': {
                  return [
                    {
                      label: 'Fix by linking an attachment to transaction...',
                      onClick: async () => {
                        await openDialog(TransactionDialog, {
                          mode: { type: 'edit', transactionId: entry.transactionId },
                        })
                        await queryClient.invalidateQueries()
                      },
                    },
                  ]
                }
                case 'transactionDataConflictsWithAttachmentContent':
                  return [
                    {
                      label: 'Fix by adjusting transaction...',
                      onClick: async () => {
                        await openDialog(TransactionDialog, {
                          mode: { type: 'edit', transactionId: entry.transactionId },
                        })
                        await queryClient.invalidateQueries()
                      },
                    },
                  ]
                case 'transactionConsumesMoreAssetAmountThanAvailable': {
                  return [
                    {
                      label: 'Fix by adjusting transaction...',
                      onClick: async () => {
                        await openDialog(TransactionDialog, {
                          mode: { type: 'edit', transactionId: entry.transactionId },
                        })
                        await queryClient.invalidateQueries()
                      },
                    },
                  ]
                }
              }
            })(),
          }
        }),
    [plausibility, level]
  )

  return (
    <ViewContainer>
      <div className={stylesToolbar}>
        <div />
        <Select
          value={level}
          onChange={event => setLevel(event.target.value)}
          optionGroups={[
            {
              id: 'level',
              label: 'Level',
              options: [
                { label: 'Error', value: 'error' },
                { label: 'Warning', value: 'warning' },
                { label: 'Info', value: 'info' },
              ],
            },
          ]}
          emptyLabel="All"
          clearable
        />
      </div>
      <CardTable columns={columns} rows={rows} />
    </ViewContainer>
  )
}

const stylesToolbar = css`
  display: grid;
  gap: var(--spacing-large);
  grid-template-columns: 1fr 175px;
`

const stylesLevel = css`
  display: block;
`

const stylesLevelInfo = css`
  path {
    fill: var(--color-info);
  }
`

const stylesLevelWarning = css`
  path {
    fill: var(--color-warning);
  }
`

const stylesLevelError = css`
  path {
    fill: var(--color-error);
  }
`

const stylesDescription = css`
  word-wrap: break-word;
  text-overflow: ellipsis;
  overflow: hidden;
`
