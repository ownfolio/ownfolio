import { useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { allCurrencies } from '../../../shared/models/Currency'
import { filterNotFalse } from '../../../shared/utils/array'
import { rpcClient } from '../../api'
import { Amount } from '../../components/Amount'
import { CardTable, TableDefinitionColumn, TableDefinitionRow, TableExpansionState } from '../../components/CardTable'
import { useDialogs } from '../../components/DialogsContext'
import { Percentage } from '../../components/Percentage'
import { SubText } from '../../components/SubText'
import { usePersistentState } from '../../hooks/usePersistentState'
import { AccountDialog } from '../accounts/AccountDialog'
import { AssetDialog } from '../assets/AssetDialog'
import { TransactionDialog } from '../transactions/TransactionDialog'
export const AssetOpenPositionsTable: React.FC<{ timetravel?: string }> = ({ timetravel }) => {
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
  const { data: evaluations } = useSuspenseQuery({
    queryKey: ['evaluatePositions', timetravel],
    queryFn: () =>
      rpcClient
        .evaluatePositions({ when: !timetravel ? { type: 'now' } : { type: 'date', date: timetravel } })
        .then(r => r.data),
  })

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'asset', title: 'Asset', minWidth: 150 },
      { id: 'openDate', title: 'Open Date', align: 'right', width: 125, priority: 3 },
      { id: 'amount', title: 'Amount', align: 'right', width: 200, priority: 2 },
      { id: 'profit', title: 'Profit', align: 'right', width: 200, priority: 1 },
      { id: 'currentPrice', title: 'Current Price', align: 'right', width: 200 },
    ],
    []
  )
  const rows = React.useMemo<TableDefinitionRow[]>(() => {
    return evaluations.value.openAssetPositions.flatMap(p => {
      const account = accounts.find(a => a.id === p.accountId)
      const portfolio = portfolios.find(p => p.id === account?.portfolioId)
      const asset = assets.find(s => s.id === p.assetId)
      const assetCurrency = allCurrencies.find(c => c.symbol === asset?.currency)
      const profit = BigNumber(p.currentPrice).minus(p.openPrice)
      const profitPercentage = BigNumber(p.currentPrice).dividedBy(p.openPrice).minus(1).multipliedBy(100)
      const id = `${p.accountId}-${p.assetId}`

      if (asset?.status === 'hidden' || account?.status === 'hidden' || portfolio?.status === 'hidden') {
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
            openDate: p.openDate,
            amount: (
              <Amount
                amount={p.amount}
                denomination={asset?.denomination || 0}
                symbol={asset?.symbol || '???'}
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
            currentPrice: (
              <Amount
                amount={p.currentPrice}
                denomination={assetCurrency?.denomination || 0}
                symbol={assetCurrency?.symbol || '???'}
                abbreviate
              />
            ),
          },
          subRows: p.positions.map((pp, idx) => {
            const profit = BigNumber(pp.currentPrice).minus(pp.openPrice)
            return {
              id: `${id}-${idx}`,
              columns: {
                openDate: pp.openDate,
                amount: (
                  <Amount
                    amount={pp.amount}
                    denomination={asset?.denomination || 0}
                    symbol={asset?.symbol || '???'}
                    abbreviate
                  />
                ),
                profit: (
                  <Amount
                    amount={profit}
                    denomination={assetCurrency?.denomination || 0}
                    symbol={assetCurrency?.symbol || '???'}
                    abbreviate
                    signColor
                    signChar
                  />
                ),
                currentPrice: (
                  <Amount
                    amount={pp.currentPrice}
                    denomination={assetCurrency?.denomination || 0}
                    symbol={assetCurrency?.symbol || '???'}
                    abbreviate
                  />
                ),
              },
              menuItems: [
                {
                  label: 'Edit open transaction',
                  onClick: async () => {
                    await openDialog(TransactionDialog, {
                      mode: { type: 'edit', transactionId: pp.openTransactionId },
                    })
                  },
                },
              ],
            }
          }),
          menuItems: filterNotFalse([
            !!asset?.quoteProvider && {
              label: 'Show chart',
              onClick: () => navigate(`/chart/asset/${asset.id}`),
            },
            !!asset?.quoteProvider && null,
            {
              label: 'Buy...',
              onClick: async () => {
                await openDialog(TransactionDialog, {
                  mode: {
                    type: 'create',
                    transactionTemplate: {
                      data: {
                        type: 'assetBuy',
                        assetAccountId: p.accountId,
                        assetId: p.assetId,
                        assetAmount: '',
                        cashAccountId: '',
                        cashAmount: '',
                        feeCashAmount: '',
                      },
                    },
                  },
                })
              },
            },
            {
              label: 'Sell...',
              onClick: async () => {
                await openDialog(TransactionDialog, {
                  mode: {
                    type: 'create',
                    transactionTemplate: {
                      data: {
                        type: 'assetSell',
                        assetAccountId: p.accountId,
                        assetId: p.assetId,
                        assetAmount: p.amount.toString(),
                        cashAccountId: '',
                        cashAmount: '',
                        feeCashAmount: '',
                        taxCashAmount: '',
                      },
                    },
                  },
                })
              },
            },
            null,
            {
              label: 'Edit account',
              onClick: async () => {
                await openDialog(AccountDialog, { mode: { type: 'edit', accountId: p.accountId } })
              },
            },
            {
              label: 'Edit asset',
              onClick: async () => {
                await openDialog(AssetDialog, { mode: { type: 'edit', assetId: p.assetId } })
              },
            },
          ]),
        },
      ]
    })
  }, [allCurrencies, portfolios, accounts, assets, evaluations])

  const expansion = usePersistentState<TableExpansionState>(
    'dashboard.assetOpenPositionsTable.expansion',
    z.record(z.union([z.string(), z.number()]), z.boolean()),
    {}
  )
  return <CardTable columns={columns} rows={rows} expansion={expansion} />
}
