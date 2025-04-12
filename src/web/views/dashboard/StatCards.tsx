import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'

import { rootCurrency } from '../../../shared/models/Currency'
import { dateFormat, dateMinus, dateParse, dateStartOf } from '../../../shared/utils/date'
import { recordMap } from '../../../shared/utils/record'
import { rpcClient } from '../../api'
import { Amount } from '../../components/Amount'
import { Card } from '../../components/Card'
import { Percentage } from '../../components/Percentage'

export const StatCards: React.FC<{ timetravel?: string }> = ({ timetravel }) => {
  const { data: evaluations } = useSuspenseQuery({
    queryKey: ['statCards', timetravel],
    queryFn: async () => {
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
          buckets: [{ type: 'all' }],
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
    },
  })

  const { total: totalYtd, deposit: depositYtd } = evaluations.value['all'][0]
  const { total: totalMtd, deposit: depositMtd } = evaluations.value['all'][1]
  const { total: totalWtd, deposit: depositWtd } = evaluations.value['all'][2]
  const { total: totalToday, deposit: depositToday } = evaluations.value['all'][3]
  const { total, deposit } = evaluations.value['all'][4]
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

  return (
    <div className={stylesGrid}>
      <Card className={stylesCard}>
        <div className={stylesCardContent}>
          <div className={stylesCardTitle}>Total</div>
          <div>
            <Amount amount={total} denomination={rootCurrency.denomination} symbol={rootCurrency.symbol} abbreviate />
          </div>
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
            <Percentage percentage={profitPercentage} decimals={2} signChar signColor signIcon />
          </div>
        </div>
      </Card>
      <Card className={stylesCard}>
        <div className={stylesCardContent}>
          <div className={stylesCardTitle}>Change (Today)</div>
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
        </div>
      </Card>
      <Card className={stylesCard}>
        <div className={stylesCardContent}>
          <div className={stylesCardTitle}>Change (WTD)</div>
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
        </div>
      </Card>
      <Card className={stylesCard}>
        <div className={stylesCardContent}>
          <div className={stylesCardTitle}>Change (MTD)</div>
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
        </div>
      </Card>
      <Card className={stylesCard}>
        <div className={stylesCardContent}>
          <div className={stylesCardTitle}>Change (YTD)</div>
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
        </div>
      </Card>
    </div>
  )
}

const stylesGrid = css`
  display: grid;
  gap: var(--spacing-large);
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
`

const stylesCardTitle = css`
  font-weight: bold;
`

const stylesCard = css`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
`

const stylesCardContent = css`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
  padding: var(--spacing-medium);
  align-items: center;
  justify-content: center;
`
