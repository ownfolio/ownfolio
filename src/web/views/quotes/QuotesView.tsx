import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'
import { useParams } from 'react-router-dom'

import { allCurrencies } from '../../../shared/models/Currency'
import { filterNotFalse } from '../../../shared/utils/array'
import { rpcClient } from '../../api'
import { Amount } from '../../components/Amount'
import { Button } from '../../components/Button'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDialogs } from '../../components/DialogsContext'
import { ViewContainer } from '../../components/ViewContainer'
import { QuoteDialog } from './QuoteDialog'

export const QuotesView: React.FC = () => {
  const params = useParams() as { assetId: string }
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const { data: asset } = useSuspenseQuery({
    queryKey: ['assets', params.assetId],

    queryFn: () => rpcClient.retrieveAsset({ id: params.assetId }).then(r => r.data),
  })
  const assetCurrency = allCurrencies.find(c => c.symbol === asset.currency)
  const { data: quotes } = useSuspenseQuery({
    queryKey: ['assets', params.assetId, 'quotes'],

    queryFn: () => rpcClient.listQuotesForAsset({ id: params.assetId }).then(r => r.data),
  })

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'date', title: 'Date', minWidth: 250 },
      { id: 'open', title: 'Open', align: 'right', width: 150, priority: 1, className: stylesNumberColumn },
      { id: 'high', title: 'High', align: 'right', width: 150, priority: 1, className: stylesNumberColumn },
      { id: 'low', title: 'Low', align: 'right', width: 150, priority: 1, className: stylesNumberColumn },
      { id: 'close', title: 'Close', align: 'right', width: 150, className: stylesNumberColumn },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(
    () =>
      quotes.map(quote => {
        return {
          id: quote.date,
          columns: {
            date: quote.date,
            open: quote.open && (
              <Amount
                amount={BigNumber(quote.open)}
                denomination={assetCurrency?.denomination || 0}
                symbol={assetCurrency?.symbol || '???'}
                nonPrivate
              />
            ),
            high: quote.high && (
              <Amount
                amount={BigNumber(quote.high)}
                denomination={assetCurrency?.denomination || 0}
                symbol={assetCurrency?.symbol || '???'}
                nonPrivate
              />
            ),
            low: quote.low && (
              <Amount
                amount={BigNumber(quote.low)}
                denomination={assetCurrency?.denomination || 0}
                symbol={assetCurrency?.symbol || '???'}
                nonPrivate
              />
            ),
            close: (
              <Amount
                amount={BigNumber(quote.close)}
                denomination={assetCurrency?.denomination || 0}
                symbol={assetCurrency?.symbol || '???'}
                nonPrivate
              />
            ),
          },
          menuItems: filterNotFalse([
            {
              label: 'Edit',
              onClick: async () => {
                await openDialog(QuoteDialog, { mode: { type: 'edit', assetId: quote.assetId, date: quote.date } })
              },
            },
            {
              label: 'Delete',
              onClick: async () => {
                const result = await openDialog(ConfirmationDialog, {
                  question: `Sure that you want to delete the quote ${quote.date}? This cannot be undone.`,
                  yesText: `Yes, delete ${quote.date}!`,
                })
                if (result) {
                  await rpcClient.deleteQuoteForAsset({ id: quote.assetId, date: quote.date })
                  await queryClient.invalidateQueries()
                }
              },
            },
          ]),
        }
      }),
    [asset, quotes]
  )

  return (
    <ViewContainer>
      <div className={stylesToolbar}>
        <Button
          variant="primary"
          onClick={async () => {
            await openDialog(QuoteDialog, {
              mode: {
                type: 'create',
                assetId: asset.id,
              },
            })
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

const stylesNumberColumn = css`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: wrap;
`
