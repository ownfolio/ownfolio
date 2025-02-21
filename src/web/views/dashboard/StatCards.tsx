import { css } from '@linaria/core'
import { useQuery } from '@tanstack/react-query'
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
  const evaluations = useQuery(['statCards', timetravel], async () => {
    const now = !timetravel ? new Date() : dateParse(timetravel)
    const raw = await rpcClient
      .evaluateSummary({
        when: {
          type: 'dates',
          dates: [
            dateStartOf(now, 'year'),
            dateMinus(dateStartOf(now, 'day'), 'day', 30),
            dateMinus(dateStartOf(now, 'day'), 'day', 1),
            dateMinus(dateStartOf(now, 'day'), 'day', 0),
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
  }).data!

  const { total: totalYtd, deposit: depositYtd } = evaluations.value['all'][0]
  const { total: total30d, deposit: deposit30d } = evaluations.value['all'][1]
  const { total: total1d, deposit: deposit1d } = evaluations.value['all'][2]
  const { total, deposit } = evaluations.value['all'][3]
  const changeYtd = total.minus(deposit).minus(totalYtd.minus(depositYtd))
  const changeYtdPercentage = changeYtd.dividedBy(totalYtd).multipliedBy(100)
  const change30d = total.minus(deposit).minus(total30d.minus(deposit30d))
  const change30dPercentage = change30d.dividedBy(total30d).multipliedBy(100)
  const change1d = total.minus(deposit).minus(total1d.minus(deposit1d))
  const change1dPercentage = change1d.dividedBy(total1d).multipliedBy(100)
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
          <div className={stylesCardTitle}>Change (1d)</div>
          <div>
            <Amount
              amount={change1d}
              denomination={rootCurrency.denomination}
              symbol={rootCurrency.symbol}
              abbreviate
              signColor
              signChar
              signIcon
            />
          </div>
          <div>
            <Percentage percentage={change1dPercentage} decimals={2} signChar signColor signIcon />
          </div>
        </div>
      </Card>
      <Card className={stylesCard}>
        <div className={stylesCardContent}>
          <div className={stylesCardTitle}>Change (30d)</div>
          <div>
            <Amount
              amount={change30d}
              denomination={rootCurrency.denomination}
              symbol={rootCurrency.symbol}
              abbreviate
              signColor
              signChar
              signIcon
            />
          </div>
          <div>
            <Percentage percentage={change30dPercentage} decimals={2} signChar signColor signIcon />
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
