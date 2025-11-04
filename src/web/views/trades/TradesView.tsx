import { useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { balanceSchema } from '../../../shared/models/Balance'
import { currenciesList } from '../../../shared/models/Currency'
import { filterNotFalse, groupBy, selectionSortBy } from '../../../shared/utils/array'
import { rpcClient } from '../../api'
import { Amount } from '../../components/Amount'
import { CardTable, TableDefinitionColumn, TableDefinitionRow, TableExpansionState } from '../../components/CardTable'
import { useDialogs } from '../../components/DialogsContext'
import { Percentage } from '../../components/Percentage'
import { SubText } from '../../components/SubText'
import { ViewContainer } from '../../components/ViewContainer'
import { usePersistentState } from '../../hooks/usePersistentState'
import { AccountDialog } from '../accounts/AccountDialog'
import { AssetDialog } from '../assets/AssetDialog'
import { TransactionDialog } from '../transactions/TransactionDialog'

export const TradesView: React.FC = () => {
  const navigate = useNavigate()
  const { openDialog } = useDialogs()
  const { data: portfolios } = useSuspenseQuery({
    queryKey: ['portfolios'],
    queryFn: () => rpcClient.listPortfolios({}).then(r => r.data),
  })
  const { data: accounts } = useSuspenseQuery({
    queryKey: ['accounts'],
    queryFn: () => rpcClient.listAccounts({}).then(r => r.data),
  })
  const { data: assets } = useSuspenseQuery({
    queryKey: ['assets'],
    queryFn: () => rpcClient.listAssets({}).then(r => r.data),
  })
  const { data: balances } = useSuspenseQuery({
    queryKey: ['balances', 'now'],
    queryFn: () => rpcClient.evaluateBalances({ when: { type: 'now' } }).then(r => r.data),
  })
  const balance = React.useMemo(() => balanceSchema.parse(balances[0]), [balances])
  const groupedOpenAssetPositions = React.useMemo(
    () =>
      groupBy(
        selectionSortBy(balance.assetPositions.open, (a, b) =>
          a.openDate > b.openDate || (a.openDate === b.openDate && a.openTime > b.openTime) ? -1 : 0
        ),
        p => `${p.accountId}-${p.assetId}`
      ),
    [balance]
  )
  const groupedClosedAssetPositions = React.useMemo(
    () =>
      groupBy(
        selectionSortBy(balance.assetPositions.closed, (a, b) =>
          a.closeDate > b.closeDate || (a.closeDate === b.closeDate && a.closeTime > b.closeTime) ? -1 : 0
        ),
        p => `${p.accountId}-${p.assetId}`
      ),
    [balance]
  )
  const [showHidden, setShowHidden] = React.useState(false)

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'asset', title: 'Asset', minWidth: 150 },
      { id: 'openDate', title: 'Open Date', align: 'right', width: 125, priority: 3 },
      { id: 'closeDate', title: 'Close Date', align: 'right', width: 125, priority: 3 },
      { id: 'amount', title: 'Amount', align: 'right', width: 200, priority: 2 },
      { id: 'openPrice', title: 'Open Price', align: 'right', width: 200 },
      { id: 'currentPrice', title: 'Close/current Price', align: 'right', width: 200 },
      { id: 'profit', title: 'Profit', align: 'right', width: 200, priority: 1 },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(() => {
    return [...groupedOpenAssetPositions, ...groupedClosedAssetPositions].flatMap(ps => {
      const account = accounts.find(a => a.id === ps[0].accountId)
      const portfolio = portfolios.find(p => p.id === account?.portfolioId)
      const asset = assets.find(s => s.id === ps[0].assetId)
      const assetCurrency = currenciesList.find(c => c.symbol === asset?.currency)
      const currentPrice = ps
        .map(p =>
          p.state === 'open' ? BigNumber(p.amount).multipliedBy(balance.quotes[p.assetId] || p.openPrice) : p.closePrice
        )
        .reduce((sum, p) => sum.plus(p), BigNumber(0))
      const openPrice = ps.reduce((sum, p) => sum.plus(p.openPrice), BigNumber(0))
      const profit = currentPrice.minus(openPrice)
      const profitPercentage = currentPrice.dividedBy(openPrice).minus(1).multipliedBy(100)
      const openDate = ps.reduce<string | undefined>(
        (min, p) => (!min || p.openDate < min ? p.openDate : min),
        undefined
      )
      const closeDate = ps.reduce<string | undefined>(
        (max, p) => (p.state === 'closed' && (!max || p.closeDate > max) ? p.closeDate : max),
        undefined
      )
      const amount = ps.reduce((sum, p) => sum.plus(p.amount), BigNumber(0))
      const id = `${account?.id}-${asset?.id}-${ps[0].state}`

      if (
        !showHidden &&
        (asset?.status === 'hidden' || account?.status === 'hidden' || portfolio?.status === 'hidden')
      ) {
        return []
      }

      return [
        {
          id,
          columns: {
            asset: (
              <>
                <div>{asset?.name || '???'}</div>
                <div>
                  <SubText>{`${account?.name || '???'} (${portfolio?.name || '???'})`}</SubText>
                </div>
              </>
            ),
            openDate: openDate || '-',
            closeDate: closeDate || '-',
            amount: (
              <Amount
                amount={amount}
                denomination={asset?.denomination || 0}
                symbol={asset?.symbol || '???'}
                abbreviate
              />
            ),
            openPrice: (
              <Amount
                amount={openPrice}
                denomination={assetCurrency?.denomination || 0}
                symbol={assetCurrency?.symbol || '???'}
                abbreviate
              />
            ),
            currentPrice: (
              <Amount
                amount={currentPrice}
                denomination={assetCurrency?.denomination || 0}
                symbol={assetCurrency?.symbol || '???'}
                abbreviate
              />
            ),
            profit: (
              <>
                <div>
                  <Amount
                    amount={profit}
                    denomination={assetCurrency?.denomination || 0}
                    symbol={assetCurrency?.symbol || '???'}
                    abbreviate
                    signColor
                    signChar
                    signIcon
                  />
                </div>
                <div>
                  <Percentage percentage={profitPercentage} decimals={2} signColor signChar signIcon />
                </div>
              </>
            ),
          },
          menuItems: filterNotFalse([
            !!asset?.quoteProvider && {
              label: 'Show chart',
              onClick: () => navigate(`/chart/asset/${asset.id}`),
            },
            !!asset?.quoteProvider && null,
            !!account && {
              label: 'Edit account',
              onClick: async () => {
                await openDialog(AccountDialog, { mode: { type: 'edit', accountId: account.id } })
              },
            },
            !!asset && {
              label: 'Edit asset',
              onClick: async () => {
                await openDialog(AssetDialog, { mode: { type: 'edit', assetId: asset.id } })
              },
            },
          ]),
          subRows: ps.flatMap(p => {
            const account = accounts.find(a => a.id === p.accountId)
            const portfolio = portfolios.find(p => p.id === account?.portfolioId)
            const asset = assets.find(s => s.id === p.assetId)
            const assetCurrency = currenciesList.find(c => c.symbol === asset?.currency)
            const currentPrice =
              p.state === 'open'
                ? BigNumber(p.amount).multipliedBy(balance.quotes[p.assetId] || p.openPrice)
                : p.closePrice
            const profit = currentPrice.minus(p.openPrice)
            const profitPercentage = currentPrice.dividedBy(p.openPrice).minus(1).multipliedBy(100)
            const id = p.openTransactionId

            return [
              {
                id,
                columns: {
                  asset: (
                    <>
                      <div>{asset?.name || '???'}</div>
                      <div>
                        <SubText>{`${account?.name || '???'} (${portfolio?.name || '???'})`}</SubText>
                      </div>
                    </>
                  ),
                  openDate: p.openDate,
                  closeDate: p.state === 'closed' ? p.closeDate : '-',
                  amount: (
                    <Amount
                      amount={p.amount}
                      denomination={asset?.denomination || 0}
                      symbol={asset?.symbol || '???'}
                      abbreviate
                    />
                  ),
                  openPrice: (
                    <Amount
                      amount={p.openPrice}
                      denomination={assetCurrency?.denomination || 0}
                      symbol={assetCurrency?.symbol || '???'}
                      abbreviate
                    />
                  ),
                  currentPrice: (
                    <Amount
                      amount={currentPrice}
                      denomination={assetCurrency?.denomination || 0}
                      symbol={assetCurrency?.symbol || '???'}
                      abbreviate
                    />
                  ),
                  profit: (
                    <>
                      <div>
                        <Amount
                          amount={profit}
                          denomination={assetCurrency?.denomination || 0}
                          symbol={assetCurrency?.symbol || '???'}
                          abbreviate
                          signColor
                          signChar
                          signIcon
                        />
                      </div>
                      <div>
                        <Percentage percentage={profitPercentage} decimals={2} signColor signChar signIcon />
                      </div>
                    </>
                  ),
                },
                menuItems: filterNotFalse([
                  {
                    label: 'Edit open transaction',
                    onClick: async () => {
                      await openDialog(TransactionDialog, {
                        mode: { type: 'edit', transactionId: p.openTransactionId },
                      })
                    },
                  },
                  p.state === 'closed' && {
                    label: 'Edit close transaction',
                    onClick: async () => {
                      await openDialog(TransactionDialog, {
                        mode: { type: 'edit', transactionId: p.closeTransactionId },
                      })
                    },
                  },
                ]),
              },
            ]
          }),
        },
      ]
    })
  }, [currenciesList, portfolios, accounts, assets, groupedOpenAssetPositions, groupedClosedAssetPositions, showHidden])

  const expansion = usePersistentState<TableExpansionState>(
    'dashboard.assetOpenPositionsTable.expansion',
    z.record(z.union([z.string(), z.number()]), z.boolean()),
    {}
  )
  return (
    <ViewContainer>
      <CardTable columns={columns} rows={rows} expansion={expansion} />
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
