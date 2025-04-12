import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import React from 'react'
import { BiSolidCommentError, BiSolidError, BiSolidErrorAlt } from 'react-icons/bi'

import { renderTransactionAsString } from '../../../shared/models/Transaction'
import { rpcClient } from '../../api'
import { Amount } from '../../components/Amount'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { useDialogs } from '../../components/DialogsContext'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { ViewContainer } from '../../components/ViewContainer'
import { TransactionDialog } from '../transactions/TransactionDialog'

export const PlausibilityView: React.FC = () => {
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const { data: accounts } = useSuspenseQuery({
    queryKey: ['accounts'],
    queryFn: () => rpcClient.listAccounts({}).then(r => r.data),
  })
  const { data: assets } = useSuspenseQuery({
    queryKey: ['assets'],
    queryFn: () => rpcClient.listAssets({}).then(r => r.data),
  })
  const { data: transactions } = useSuspenseQuery({
    queryKey: ['transactions'],
    queryFn: () => rpcClient.listTransactions({}).then(r => r.data),
  })
  const { data: attachments } = useSuspenseQuery({
    queryKey: ['attachments'],
    queryFn: () => rpcClient.listAttachments({}).then(r => r.data),
  })
  const {
    data: { data: plausibility },
  } = useSuspenseQuery({
    queryKey: ['evaluatePlausibility'],
    queryFn: () => rpcClient.evaluatePlausibility(),
  })
  const [showInfoLevel, setShowInfoLevel] = React.useState(false)

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
        .filter(entry => showInfoLevel || entry.level !== 'info')
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
                    return <span>Transaction has no attachment</span>
                  }
                  case 'transactionDataConflictsWithAttachmentContent': {
                    return (
                      <span>
                        Transaction data conflicts on {entry.conflicts.map(c => c.key).join(', ')} with linked
                        attachment content
                      </span>
                    )
                  }
                  case 'transactionConsumesMoreAssetAmountThanAvailable': {
                    const account = accounts.find(tx => tx.id === entry.assetAccountId)
                    const asset = assets.find(tx => tx.id === entry.assetId)
                    return (
                      <>
                        <span>Transaction consumes </span>
                        <Amount
                          amount={entry.excessiveAssetAmount}
                          denomination={asset?.denomination || 0}
                          symbol={asset?.symbol || '???'}
                        />
                        <span> more than available in account {account?.name || '???'}</span>
                      </>
                    )
                  }
                }
              })(),
            },
            menuItems: ((): NonNullable<TableDefinitionRow['menuItems']> => {
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
            subRows: ((): NonNullable<TableDefinitionRow['subRows']> => {
              switch (entry.type) {
                case 'transactionHasNoAttachment': {
                  const transaction = transactions.find(tx => tx.id === entry.transactionId)
                  return [
                    {
                      id: 'transaction',
                      columns: {
                        description: transaction
                          ? renderTransactionAsString(transaction, accounts, assets, false)
                          : '???',
                      },
                    },
                  ]
                }
                case 'transactionDataConflictsWithAttachmentContent': {
                  const transaction = transactions.find(tx => tx.id === entry.transactionId)
                  const attachment = attachments.find(a => a.id === entry.attachmentId)
                  return [
                    {
                      id: 'transaction',
                      columns: {
                        description: transaction
                          ? renderTransactionAsString(transaction, accounts, assets, false)
                          : '???',
                      },
                    },
                    {
                      id: 'attachment',
                      columns: {
                        description: attachment ? attachment.fileName : '???',
                      },
                    },
                  ]
                }
                case 'transactionConsumesMoreAssetAmountThanAvailable': {
                  const transaction = transactions.find(tx => tx.id === entry.transactionId)
                  return [
                    {
                      id: 'transaction',
                      columns: {
                        description: transaction
                          ? renderTransactionAsString(transaction, accounts, assets, false)
                          : '???',
                      },
                    },
                  ]
                }
              }
            })(),
          }
        }),
    [plausibility, showInfoLevel]
  )

  return (
    <ViewContainer>
      <div className={stylesToolbar}>
        <div />
        <Label htmlFor="showInfoLevel" text="Show info" position="right">
          <Input
            id="showInfoLevel"
            type="checkbox"
            checked={showInfoLevel}
            onChange={event => setShowInfoLevel(event.target.checked)}
          />
        </Label>
      </div>
      <CardTable columns={columns} rows={rows} />
    </ViewContainer>
  )
}

const stylesToolbar = css`
  display: grid;
  gap: var(--spacing-large);
  grid-template-columns: 1fr auto;
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
