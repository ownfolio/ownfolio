import { useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { Balance } from '../../../../shared/models/Balance'
import { rootCurrency } from '../../../../shared/models/Currency'
import { DashboardCardHoldings } from '../../../../shared/models/Dashboard'
import { dateFormat, dateParse, dateStartOf } from '../../../../shared/utils/date'
import { rpcClient } from '../../../api'
import { Amount } from '../../../components/Amount'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../../components/CardTable'
import { useDialogs } from '../../../components/DialogsContext'
import { Percentage } from '../../../components/Percentage'
import { AccountDialog } from '../../accounts/AccountDialog'
import { PortfolioDialog } from '../../portfolios/PortfolioDialog'
import type { DashboardCardFieldsProps, DashboardCardRendererProps } from './index'

export const DashboardCardHoldingsRenderer: React.FC<DashboardCardRendererProps<DashboardCardHoldings>> = ({
  timetravel,
}) => {
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
  const { data: balances } = useSuspenseQuery({
    queryKey: ['balances', timetravel],
    queryFn: () => {
      const now = !timetravel ? new Date() : dateParse(timetravel)
      return rpcClient
        .evaluateBalances({
          when: {
            type: 'dates',
            dates: [dateStartOf(now, 'day')].map(str => dateFormat(str, 'yyyy-MM-dd')),
          },
        })
        .then(r => r.data)
    },
  })
  const balance = balances[0]

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'name', title: '', minWidth: 225 },
      { id: 'profit', title: 'Profit', align: 'right', width: 200, priority: 1 },
      { id: 'cash', title: 'Cash', align: 'right', width: 200, priority: 2 },
      { id: 'assets', title: 'Assets', align: 'right', width: 200, priority: 2 },
      { id: 'total', title: 'Total', align: 'right', width: 200 },
    ],
    []
  )

  const calculateCash = (b: Balance, accountFilter?: (aid: string) => boolean): BigNumber => {
    return b.cashPositions.open
      .filter(p => !accountFilter || accountFilter(p.accountId))
      .reduce((sum, p) => sum.plus(p.amount), BigNumber(0))
  }
  const calculateAssets = (
    b: Balance,
    accountFilter?: (aid: string) => boolean,
    assetFilter?: (aid: string) => boolean
  ): BigNumber => {
    return b.assetPositions.open
      .filter(p => !accountFilter || accountFilter(p.accountId))
      .filter(p => !assetFilter || assetFilter(p.assetId))
      .reduce((sum, p) => {
        const quote = b.quotes[p.assetId]
        return sum.plus(quote ? BigNumber(quote).multipliedBy(p.amount) : p.openPrice)
      }, BigNumber(0))
  }
  const calculateTotal = (
    b: Balance,
    accountFilter?: (aid: string) => boolean,
    assetFilter?: (aid: string) => boolean
  ): BigNumber => {
    return calculateCash(b, accountFilter).plus(calculateAssets(b, accountFilter, assetFilter))
  }
  const calculateRealizedProfits = (
    b: Balance,
    accountFilter?: (aid: string) => boolean,
    assetFilter?: (aid: string) => boolean
  ): BigNumber => {
    return b.assetPositions.closed
      .filter(p => !accountFilter || accountFilter(p.accountId))
      .filter(p => !assetFilter || assetFilter(p.assetId))
      .reduce((sum, p) => sum.plus(p.closePrice).minus(p.openPrice), BigNumber(0))
  }
  const calculatePendingProfits = (
    b: Balance,
    accountFilter?: (aid: string) => boolean,
    assetFilter?: (aid: string) => boolean
  ): BigNumber => {
    return b.assetPositions.open
      .filter(p => !accountFilter || accountFilter(p.accountId))
      .filter(p => !assetFilter || assetFilter(p.assetId))
      .reduce((sum, p) => {
        const quote = b.quotes[p.assetId]
        return sum.plus(quote ? BigNumber(quote).multipliedBy(p.amount) : p.openPrice).minus(p.openPrice)
      }, BigNumber(0))
  }
  const calculateProfits = (
    b: Balance,
    accountFilter?: (aid: string) => boolean,
    assetFilter?: (aid: string) => boolean
  ): BigNumber => {
    return calculateRealizedProfits(b, accountFilter, assetFilter).plus(
      calculatePendingProfits(b, accountFilter, assetFilter)
    )
  }
  const calculateDeposits = (
    b: Balance,
    accountFilter?: (aid: string) => boolean,
    assetFilter?: (aid: string) => boolean
  ): BigNumber => {
    return calculateTotal(b, accountFilter, assetFilter).minus(calculateProfits(b, accountFilter, assetFilter))
  }
  const rows = React.useMemo<TableDefinitionRow[]>(() => {
    return [
      (() => {
        const cash = calculateCash(balance)
        const assets = calculateAssets(balance)
        const total = calculateTotal(balance)
        const deposits = calculateDeposits(balance)
        const profit = calculateProfits(balance)
        const profitPercentage = profit.dividedBy(deposits).multipliedBy(100)
        return {
          id: 'all',
          columns: {
            name: 'All',
            profit: (
              <>
                <div>
                  <Amount
                    amount={profit}
                    denomination={rootCurrency.denomination}
                    symbol={rootCurrency.symbol}
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
            cash: (
              <Amount amount={cash} denomination={rootCurrency.denomination} symbol={rootCurrency.symbol} abbreviate />
            ),
            assets: (
              <Amount
                amount={assets}
                denomination={rootCurrency.denomination}
                symbol={rootCurrency.symbol}
                abbreviate
              />
            ),
            total: (
              <Amount amount={total} denomination={rootCurrency.denomination} symbol={rootCurrency.symbol} abbreviate />
            ),
          },
          menuItems: [
            {
              label: 'Show total chart',
              onClick: () => navigate('/chart/total'),
            },
            {
              label: 'Show profit chart',
              onClick: () => navigate('/chart/profit'),
            },
          ],
        }
      })(),
      ...portfolios
        .filter(p => p.status !== 'hidden')
        .flatMap(portfolio => {
          const accountFilter = (aid: string) => accounts.find(a => a.id === aid)?.portfolioId === portfolio.id
          const cash = calculateCash(balance, accountFilter)
          const assets = calculateAssets(balance, accountFilter)
          const total = calculateTotal(balance, accountFilter)
          const deposits = calculateDeposits(balance, accountFilter)
          const profit = calculateProfits(balance, accountFilter)
          const profitPercentage = profit.dividedBy(deposits).multipliedBy(100)
          return {
            id: portfolio.id,
            columns: {
              name: portfolio.name,
              profit: (
                <>
                  <div>
                    <Amount
                      amount={profit}
                      denomination={rootCurrency.denomination}
                      symbol={rootCurrency.symbol}
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
              cash: (
                <Amount
                  amount={cash}
                  denomination={rootCurrency.denomination}
                  symbol={rootCurrency.symbol}
                  abbreviate
                />
              ),
              assets: (
                <Amount
                  amount={assets}
                  denomination={rootCurrency.denomination}
                  symbol={rootCurrency.symbol}
                  abbreviate
                />
              ),
              total: (
                <Amount
                  amount={total}
                  denomination={rootCurrency.denomination}
                  symbol={rootCurrency.symbol}
                  abbreviate
                />
              ),
            },
            menuItems: [
              {
                label: 'Show total chart',
                onClick: () => navigate(`/chart/total/${portfolio.id}`),
              },
              {
                label: 'Show profit chart',
                onClick: () => navigate(`/chart/profit/${portfolio.id}`),
              },
              null,
              {
                label: 'Edit portfolio',
                onClick: async () => {
                  await openDialog(PortfolioDialog, { mode: { type: 'edit', portfolioId: portfolio.id } })
                },
              },
            ],
            subRows: accounts
              .filter(a => a.status !== 'hidden' && a.portfolioId === portfolio.id)
              .flatMap(account => {
                const accountFilter = (aid: string) => account.id === aid
                const cash = calculateCash(balance, accountFilter)
                const assets = calculateAssets(balance, accountFilter)
                const total = calculateTotal(balance, accountFilter)
                const deposits = calculateDeposits(balance, accountFilter)
                const profit = calculateProfits(balance, accountFilter)
                const profitPercentage = profit.dividedBy(deposits).multipliedBy(100)
                return {
                  id: account.id,
                  columns: {
                    name: account.name,
                    profit: (
                      <>
                        <div>
                          <Amount
                            amount={profit}
                            denomination={rootCurrency.denomination}
                            symbol={rootCurrency.symbol}
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
                    cash: (
                      <Amount
                        amount={cash}
                        denomination={rootCurrency.denomination}
                        symbol={rootCurrency.symbol}
                        abbreviate
                      />
                    ),
                    assets: (
                      <Amount
                        amount={assets}
                        denomination={rootCurrency.denomination}
                        symbol={rootCurrency.symbol}
                        abbreviate
                      />
                    ),
                    total: (
                      <Amount
                        amount={total}
                        denomination={rootCurrency.denomination}
                        symbol={rootCurrency.symbol}
                        abbreviate
                      />
                    ),
                  },
                  menuItems: [
                    {
                      label: 'Edit portfolio',
                      onClick: async () => {
                        await openDialog(AccountDialog, { mode: { type: 'edit', accountId: account.id } })
                      },
                    },
                  ],
                }
              }),
          }
        }),
    ]
  }, [balances])
  return <CardTable columns={columns} rows={rows} expandedByDefault />
}

export const DashboardCardHoldingsFields: React.FC<DashboardCardFieldsProps<DashboardCardHoldings>> = () => {
  return null
}
