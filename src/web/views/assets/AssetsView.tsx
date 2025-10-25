import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { allCurrencies } from '../../../shared/models/Currency'
import { filterNotFalse } from '../../../shared/utils/array'
import { dateEndOf, dateFormat, dateMinus } from '../../../shared/utils/date'
import { rpcClient } from '../../api'
import { Amount } from '../../components/Amount'
import { Button } from '../../components/Button'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDialogs } from '../../components/DialogsContext'
import { Percentage } from '../../components/Percentage'
import { ViewContainer } from '../../components/ViewContainer'
import { AssetDialog } from './AssetDialog'

export const AssetsView: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const { data: assets } = useSuspenseQuery({
    queryKey: ['assets'],
    queryFn: () => rpcClient.listAssets({}).then(r => r.data),
  })
  const { data: lastYearQuotes } = useSuspenseQuery({
    queryKey: ['lastYearQuotes'],
    queryFn: () =>
      rpcClient
        .listLatestQuotes({ date: dateFormat(dateMinus(dateEndOf(new Date(), 'day'), 'year', 1), 'yyyy-MM-dd') })
        .then(r => r.data),
  })
  const { data: lastMonthQuotes } = useSuspenseQuery({
    queryKey: ['lastMonthQuotes'],
    queryFn: () =>
      rpcClient
        .listLatestQuotes({ date: dateFormat(dateMinus(dateEndOf(new Date(), 'day'), 'month', 1), 'yyyy-MM-dd') })
        .then(r => r.data),
  })
  const { data: yesterdayQuotes } = useSuspenseQuery({
    queryKey: ['yesterdayQuotes'],
    queryFn: () =>
      rpcClient
        .listLatestQuotes({ date: dateFormat(dateMinus(dateEndOf(new Date(), 'day'), 'day', 1), 'yyyy-MM-dd') })
        .then(r => r.data),
  })
  const { data: latestQuotes } = useSuspenseQuery({
    queryKey: ['latestQuotes'],
    queryFn: () => rpcClient.listLatestQuotes({}).then(r => r.data),
  })
  const [showHidden, setShowHidden] = React.useState(false)

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'name', title: 'Name', minWidth: 250 },
      { id: 'number', title: 'Number', width: 200, priority: 5, className: stylesNumberColumn },
      { id: 'symbol', title: 'Symbol', width: 100, priority: 6 },
      { id: 'lastYearQuote', title: '1Y', align: 'right', width: 150, priority: 5 },
      { id: 'lastMonthQuote', title: '1M', align: 'right', width: 150, priority: 4 },
      { id: 'yesterdayQuote', title: '1D', align: 'right', width: 150, priority: 3 },
      { id: 'latestQuote', title: 'Now', align: 'right', width: 150, priority: 1 },
      { id: 'status', title: 'Status', align: 'right', width: 150, priority: 7 },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(
    () =>
      assets
        .filter(a => showHidden || a.status !== 'hidden')
        .map(asset => {
          const assetCurrency = allCurrencies.find(c => c.symbol === asset?.currency)
          const lastYearQuote = lastYearQuotes.find(q => q.assetId === asset.id)
          const lastMonthQuote = lastMonthQuotes.find(q => q.assetId === asset.id)
          const yesterdayQuote = yesterdayQuotes.find(q => q.assetId === asset.id)
          const latestQuote = latestQuotes.find(q => q.assetId === asset.id)

          return {
            id: asset.id,
            columns: {
              name: asset.name,
              number: asset.number,
              symbol: asset.symbol,
              lastYearQuote: lastYearQuote && (
                <>
                  <div>
                    <Amount
                      amount={BigNumber(lastYearQuote.close)}
                      denomination={assetCurrency?.denomination || 0}
                      symbol={assetCurrency?.symbol || '???'}
                      nonPrivate
                    />
                  </div>
                  {latestQuote && (
                    <div>
                      <Percentage
                        percentage={BigNumber(latestQuote.close)
                          .dividedBy(lastYearQuote.close)
                          .multipliedBy(100)
                          .minus(100)}
                        decimals={2}
                        signColor
                        signIcon
                        signChar
                      />
                    </div>
                  )}
                </>
              ),
              lastMonthQuote: lastMonthQuote && (
                <div>
                  <Amount
                    amount={BigNumber(lastMonthQuote.close)}
                    denomination={assetCurrency?.denomination || 0}
                    symbol={assetCurrency?.symbol || '???'}
                    nonPrivate
                  />
                  {latestQuote && (
                    <div>
                      <Percentage
                        percentage={BigNumber(latestQuote.close)
                          .dividedBy(lastMonthQuote.close)
                          .multipliedBy(100)
                          .minus(100)}
                        decimals={2}
                        signColor
                        signIcon
                        signChar
                      />
                    </div>
                  )}
                </div>
              ),
              yesterdayQuote: yesterdayQuote && (
                <div>
                  <Amount
                    amount={BigNumber(yesterdayQuote.close)}
                    denomination={assetCurrency?.denomination || 0}
                    symbol={assetCurrency?.symbol || '???'}
                    nonPrivate
                  />
                  {latestQuote && (
                    <div>
                      <Percentage
                        percentage={BigNumber(latestQuote.close)
                          .dividedBy(yesterdayQuote.close)
                          .multipliedBy(100)
                          .minus(100)}
                        decimals={2}
                        signColor
                        signIcon
                        signChar
                      />
                    </div>
                  )}
                </div>
              ),
              latestQuote: latestQuote && (
                <div>
                  <Amount
                    amount={BigNumber(latestQuote.close)}
                    denomination={assetCurrency?.denomination || 0}
                    symbol={assetCurrency?.symbol || '???'}
                    nonPrivate
                  />
                </div>
              ),
              status: asset.status,
            },
            menuItems: filterNotFalse([
              !!asset.quoteProvider && {
                label: 'Show chart',
                onClick: () => navigate(`/chart/asset/${asset.id}`),
              },
              !!asset.quoteProvider && null,
              {
                label: 'Edit',
                onClick: async () => {
                  await openDialog(AssetDialog, { mode: { type: 'edit', assetId: asset.id } })
                },
              },
              {
                label: 'Edit quotes',
                onClick: () => navigate(`/quotes/${asset.id}`),
              },
              null,
              asset.status === 'active' && {
                label: 'Deactivate',
                onClick: async () => {
                  await rpcClient.updateAssetStatus({ id: asset.id, status: 'inactive' })
                  await queryClient.invalidateQueries()
                },
              },
              asset.status === 'inactive' && {
                label: 'Activate',
                onClick: async () => {
                  await rpcClient.updateAssetStatus({ id: asset.id, status: 'active' })
                  await queryClient.invalidateQueries()
                },
              },
              asset.status === 'inactive' && {
                label: 'Hide',
                onClick: async () => {
                  await rpcClient.updateAssetStatus({ id: asset.id, status: 'hidden' })
                  await queryClient.invalidateQueries()
                },
              },
              asset.status === 'hidden' && {
                label: 'Unhide',
                onClick: async () => {
                  await rpcClient.updateAssetStatus({ id: asset.id, status: 'inactive' })
                  await queryClient.invalidateQueries()
                },
              },
              {
                label: 'Delete',
                onClick: async () => {
                  const result = await openDialog(ConfirmationDialog, {
                    question: `Sure that you want to delete the asset ${asset.name}? This cannot be undone.`,
                    yesText: `Yes, delete ${asset.name}!`,
                  })
                  if (result) {
                    await rpcClient.deleteAsset({ id: asset.id })
                    await queryClient.invalidateQueries()
                  }
                },
              },
            ]),
          }
        }),
    [assets, lastYearQuotes, lastMonthQuotes, yesterdayQuotes, latestQuotes, showHidden]
  )

  return (
    <ViewContainer>
      <div className={stylesToolbar}>
        <Button
          variant="primary"
          onClick={async () => {
            await openDialog(AssetDialog, { mode: { type: 'create' } })
          }}
        >
          Create
        </Button>
      </div>
      <CardTable columns={columns} rows={rows} />
      {!!assets.find(a => a.status === 'hidden') && (
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
