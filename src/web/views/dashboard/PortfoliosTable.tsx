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

export const PortfoliosTable: React.FC<{ timetravel?: string }> = ({ timetravel }) => {
  const navigate = useNavigate()
  const { openDialog } = useDialogs()
  const portfolios = useQuery(['portfolios'], () => rpcClient.listPortfolios({}).then(r => r.data)).data!
  const evaluations = useQuery(['portfoliosTabls', timetravel, portfolios.map(p => p.id).join(',')], async () => {
    const now = !timetravel ? new Date() : dateParse(timetravel)
    const raw = await rpcClient
      .evaluateSummary({
        when: {
          type: 'dates',
          dates: [
            dateMinus(dateStartOf(now, 'year'), 'day', 1),
            dateMinus(dateStartOf(now, 'month'), 'day', 1),
            dateMinus(dateStartOf(now, 'week'), 'day', 1),
            dateMinus(dateStartOf(now, 'day'), 'day', 1),
            dateStartOf(now, 'day'),
          ].map(str => dateFormat(str, 'yyyy-MM-dd')),
        },
        buckets: [{ type: 'all' }, ...portfolios.map(p => ({ type: 'portfolio' as const, portfolioId: p.id }))],
        values: ['cash', 'assetsOpenPrice', 'assetsCurrentPrice', 'realizedProfits', 'total', 'deposit'],
      })
      .then(r => r.data)
    return {
      ...raw,
      value: recordMap(raw.value, items => {
        return items.map(([date, cash, assetsOpenPrice, assetsCurrentPrice, realizedProfits, total, deposit]) => {
          return {
            date: date,
            cash: BigNumber(cash),
            assetsOpenPrice: BigNumber(assetsOpenPrice),
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
      { id: 'portfolio', title: 'Portfolio', minWidth: 225 },
      { id: 'changeYtd', title: 'Change (YTD)', align: 'right', width: 200, priority: 5 },
      { id: 'changeMtd', title: 'Change (MTD)', align: 'right', width: 200, priority: 4 },
      { id: 'changeWtd', title: 'Change (WTD)', align: 'right', width: 200, priority: 3 },
      { id: 'changeToday', title: 'Change (Today)', align: 'right', width: 200, priority: 2 },
      { id: 'profit', title: 'Profit', align: 'right', width: 200, priority: 1 },
      { id: 'cash', title: 'Cash', align: 'right', width: 200, priority: 5 },
      { id: 'assets', title: 'Assets', align: 'right', width: 200, priority: 5 },
      { id: 'total', title: 'Total', align: 'right', width: 200 },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(() => {
    return [
      (() => {
        const { total: totalYtd, deposit: depositYtd } = evaluations.value['all'][0]
        const { total: totalMtd, deposit: depositMtd } = evaluations.value['all'][1]
        const { total: totalWtd, deposit: depositWtd } = evaluations.value['all'][2]
        const { total: totalToday, deposit: depositToday } = evaluations.value['all'][3]
        const { cash, assetsCurrentPrice, total, deposit } = evaluations.value['all'][4]
        const changeYtd = total.minus(deposit).minus(totalYtd.minus(depositYtd))
        const changeYtdPercentage = changeYtd.dividedBy(totalYtd).multipliedBy(100)
        const changeMtd = total.minus(deposit).minus(totalMtd.minus(depositMtd))
        const changeMtdPercentage = changeMtd.dividedBy(totalMtd).multipliedBy(100)
        const changeWtd = total.minus(deposit).minus(totalWtd.minus(depositWtd))
        const changeWtdPercentage = changeWtd.dividedBy(totalWtd).multipliedBy(100)
        const changeToday = total.minus(deposit).minus(totalToday.minus(depositToday))
        const changeTodayPercentage = changeToday.dividedBy(totalToday).multipliedBy(100)
        const profit = total.minus(deposit)
        const profitPercentage = profit.dividedBy(deposit).multipliedBy(100)
        return {
          id: 'all',
          columns: {
            portfolio: 'All',
            changeYtd: (
              <>
                <div>
                  <Amount
                    amount={changeYtd}
                    denomination={rootCurrency.denomination}
                    symbol={rootCurrency.symbol}
                    abbreviate
                    signColor
                    signChar
                    signIcon
                  />
                </div>
                <div>
                  <Percentage percentage={changeYtdPercentage} decimals={2} signChar signColor signIcon />
                </div>
              </>
            ),
            changeMtd: (
              <>
                <div>
                  <Amount
                    amount={changeMtd}
                    denomination={rootCurrency.denomination}
                    symbol={rootCurrency.symbol}
                    abbreviate
                    signColor
                    signChar
                    signIcon
                  />
                </div>
                <div>
                  <Percentage percentage={changeMtdPercentage} decimals={2} signChar signColor signIcon />
                </div>
              </>
            ),
            changeWtd: (
              <>
                <div>
                  <Amount
                    amount={changeWtd}
                    denomination={rootCurrency.denomination}
                    symbol={rootCurrency.symbol}
                    abbreviate
                    signColor
                    signChar
                    signIcon
                  />
                </div>
                <div>
                  <Percentage percentage={changeWtdPercentage} decimals={2} signChar signColor signIcon />
                </div>
              </>
            ),
            changeToday: (
              <>
                <div>
                  <Amount
                    amount={changeToday}
                    denomination={rootCurrency.denomination}
                    symbol={rootCurrency.symbol}
                    abbreviate
                    signColor
                    signChar
                    signIcon
                  />
                </div>
                <div>
                  <Percentage percentage={changeTodayPercentage} decimals={2} signChar signColor signIcon />
                </div>
              </>
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
      ...portfolios.map(portfolio => {
        const { total: totalYtd, deposit: depositYtd } = evaluations.value[portfolio.id][0]
        const { total: totalMtd, deposit: depositMtd } = evaluations.value[portfolio.id][1]
        const { total: totalWtd, deposit: depositWtd } = evaluations.value[portfolio.id][2]
        const { total: totalToday, deposit: depositToday } = evaluations.value[portfolio.id][3]
        const { cash, assetsCurrentPrice, total, deposit } = evaluations.value[portfolio.id][4]
        const changeYtd = total.minus(deposit).minus(totalYtd.minus(depositYtd))
        const changeYtdPercentage = changeYtd.dividedBy(totalYtd).multipliedBy(100)
        const changeMtd = total.minus(deposit).minus(totalMtd.minus(depositMtd))
        const changeMtdPercentage = changeMtd.dividedBy(totalMtd).multipliedBy(100)
        const changeWtd = total.minus(deposit).minus(totalWtd.minus(depositWtd))
        const changeWtdPercentage = changeWtd.dividedBy(totalWtd).multipliedBy(100)
        const changeToday = total.minus(deposit).minus(totalToday.minus(depositToday))
        const changeTodayPercentage = changeToday.dividedBy(totalToday).multipliedBy(100)
        const profit = total.minus(deposit)
        const profitPercentage = profit.dividedBy(deposit).multipliedBy(100)
        return {
          id: portfolio.id,
          columns: {
            portfolio: portfolios.find(p => p.id === portfolio.id)?.name || '???',
            changeYtd: (
              <>
                <div>
                  <Amount
                    amount={changeYtd}
                    denomination={rootCurrency.denomination}
                    symbol={rootCurrency.symbol}
                    abbreviate
                    signColor
                    signChar
                    signIcon
                  />
                </div>
                <div>
                  <Percentage percentage={changeYtdPercentage} decimals={2} signChar signColor signIcon />
                </div>
              </>
            ),
            changeMtd: (
              <>
                <div>
                  <Amount
                    amount={changeMtd}
                    denomination={rootCurrency.denomination}
                    symbol={rootCurrency.symbol}
                    abbreviate
                    signColor
                    signChar
                    signIcon
                  />
                </div>
                <div>
                  <Percentage percentage={changeMtdPercentage} decimals={2} signChar signColor signIcon />
                </div>
              </>
            ),
            changeWtd: (
              <>
                <div>
                  <Amount
                    amount={changeWtd}
                    denomination={rootCurrency.denomination}
                    symbol={rootCurrency.symbol}
                    abbreviate
                    signColor
                    signChar
                    signIcon
                  />
                </div>
                <div>
                  <Percentage percentage={changeWtdPercentage} decimals={2} signChar signColor signIcon />
                </div>
              </>
            ),
            changeToday: (
              <>
                <div>
                  <Amount
                    amount={changeToday}
                    denomination={rootCurrency.denomination}
                    symbol={rootCurrency.symbol}
                    abbreviate
                    signColor
                    signChar
                    signIcon
                  />
                </div>
                <div>
                  <Percentage percentage={changeTodayPercentage} decimals={2} signChar signColor signIcon />
                </div>
              </>
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
    ]
  }, [evaluations])

  const expansion = usePersistentState<TableExpansionState>(
    'dashboard.totalTable.expansion',
    z.record(z.union([z.string(), z.number()]), z.boolean()),
    {}
  )
  return <CardTable columns={columns} rows={rows} expansion={expansion} />
}
