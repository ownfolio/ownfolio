import { useQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { rootCurrency } from '../../../shared/models/Currency'
import { dateFormat, dateMinus, dateParse, dateStartOf } from '../../../shared/utils/date'
import { recordMap } from '../../../shared/utils/record'
import { rpcClient } from '../../api'
import { Amount } from '../../components/Amount'
import { CardTable, TableDefinitionColumn, TableDefinitionRow, TableExpansionState } from '../../components/CardTable'
import { useDialogs } from '../../components/DialogsContext'
import { Percentage } from '../../components/Percentage'
import { usePersistentState } from '../../hooks/usePersistentState'
import { PortfolioDialog } from '../portfolios/PortfolioDialog'

export const TotalTable: React.FC<{ timetravel?: string }> = ({ timetravel }) => {
  const navigate = useNavigate()
  const { openDialog } = useDialogs()
  const portfolios = useQuery(['portfolios'], () => rpcClient.listPortfolios({}).then(r => r.data)).data!
  const evaluations = useQuery(['totalTable', timetravel, portfolios.map(p => p.id).join(',')], async () => {
    const now = !timetravel ? new Date() : dateParse(timetravel)
    const raw = await rpcClient
      .evaluateSummary({
        when: {
          type: 'dates',
          dates: [
            dateMinus(dateStartOf(now, 'day'), 'day', 30),
            dateMinus(dateStartOf(now, 'day'), 'day', 7),
            dateMinus(dateStartOf(now, 'day'), 'day', 1),
            dateMinus(dateStartOf(now, 'day'), 'day', 0),
          ].map(str => dateFormat(str, 'yyyy-MM-dd')),
        },
        buckets: [{ type: 'all' }, ...portfolios.map(p => ({ type: 'portfolio' as const, portfolioId: p.id }))],
        values: ['cash', 'assetsOpenPrice', 'assetsCurrentPrice', 'realizedProfits', 'total', 'deposit'],
      })
      .then(r => r.data)
    return {
      ...raw,
      value: recordMap(raw.value, items => {
        return items.map(([date, cash, assetOpenPrice, assetsCurrentPrice, realizedProfits, total, deposit]) => {
          return {
            date: date,
            cash: BigNumber(cash),
            assetOpenPrice: BigNumber(assetOpenPrice),
            assetsCurrentPrice: BigNumber(assetsCurrentPrice),
            realizedProfits: BigNumber(realizedProfits),
            total: BigNumber(total),
            deposit: BigNumber(deposit),
          }
        })
      }),
    }
  }).data!

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'portfolio', title: 'Portfolio', minWidth: 150 },
      { id: 'change30d', title: 'Change (30d)', align: 'right', width: 140, priority: 4 },
      { id: 'change7d', title: 'Change (7d)', align: 'right', width: 140, priority: 3 },
      { id: 'change1d', title: 'Change (1d)', align: 'right', width: 140, priority: 2 },
      { id: 'profit', title: 'Profit', align: 'right', width: 200, priority: 1 },
      { id: 'cash', title: 'Cash', align: 'right', width: 200, priority: 5 },
      { id: 'assets', title: 'Assets', align: 'right', width: 200, priority: 5 },
      { id: 'total', title: 'Total', align: 'right', width: 200 },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(() => {
    const { total: total30d, deposit: deposit30d } = evaluations.value.all[0]
    const { total: total7d, deposit: deposit7d } = evaluations.value.all[1]
    const { total: total1d, deposit: deposit1d } = evaluations.value.all[2]
    const { cash, assetsCurrentPrice, total, deposit } = evaluations.value.all[3]
    const profit = total.minus(deposit)
    const profitPercentage = profit.dividedBy(deposit).multipliedBy(100)
    return [
      {
        id: 'all',
        columns: {
          portfolio: 'All',
          change30d: (
            <Percentage
              percentage={total.dividedBy(total30d.plus(deposit).minus(deposit30d)).minus(1).multipliedBy(100)}
              decimals={2}
              signChar
              signColor
              signIcon
            />
          ),
          change7d: (
            <Percentage
              percentage={total.dividedBy(total7d.plus(deposit).minus(deposit7d)).minus(1).multipliedBy(100)}
              decimals={2}
              signChar
              signColor
              signIcon
            />
          ),
          change1d: (
            <Percentage
              percentage={total.dividedBy(total1d.plus(deposit).minus(deposit1d)).minus(1).multipliedBy(100)}
              decimals={2}
              signChar
              signColor
              signIcon
            />
          ),
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
              amount={assetsCurrentPrice}
              denomination={rootCurrency.denomination}
              symbol={rootCurrency.symbol}
              abbreviate
            />
          ),
          total: (
            <Amount amount={total} denomination={rootCurrency.denomination} symbol={rootCurrency.symbol} abbreviate />
          ),
        },
        subRows: portfolios.map(portfolio => {
          const { total: total30d, deposit: deposit30d } = evaluations.value[portfolio.id][0]
          const { total: total7d, deposit: deposit7d } = evaluations.value[portfolio.id][1]
          const { total: total1d, deposit: deposit1d } = evaluations.value[portfolio.id][2]
          const { cash, assetsCurrentPrice, total, deposit } = evaluations.value[portfolio.id][3]
          const profit = total.minus(deposit)
          const profitPercentage = profit.dividedBy(deposit).multipliedBy(100)
          return {
            id: portfolio.id,
            columns: {
              portfolio: portfolios.find(p => p.id === portfolio.id)?.name || '???',
              change30d: (
                <Percentage
                  percentage={total.dividedBy(total30d.plus(deposit).minus(deposit30d)).minus(1).multipliedBy(100)}
                  decimals={2}
                  signChar
                  signColor
                  signIcon
                />
              ),
              change7d: (
                <Percentage
                  percentage={total.dividedBy(total7d.plus(deposit).minus(deposit7d)).minus(1).multipliedBy(100)}
                  decimals={2}
                  signChar
                  signColor
                  signIcon
                />
              ),
              change1d: (
                <Percentage
                  percentage={total.dividedBy(total1d.plus(deposit).minus(deposit1d)).minus(1).multipliedBy(100)}
                  decimals={2}
                  signChar
                  signColor
                  signIcon
                />
              ),
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
                  amount={assetsCurrentPrice}
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
          }
        }),
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
      },
    ]
  }, [evaluations])

  const expansion = usePersistentState<TableExpansionState>(
    'dashboard.totalTable.expansion',
    z.record(z.union([z.string(), z.number()]), z.boolean()),
    {}
  )
  return <CardTable columns={columns} rows={rows} expansion={expansion} />
}
