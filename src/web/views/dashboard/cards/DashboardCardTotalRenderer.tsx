import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'

import { rootCurrency } from '../../../../shared/models/Currency'
import { DashboardCard } from '../../../../shared/models/DashboardCard'
import { dateFormat, dateParse, dateStartOf } from '../../../../shared/utils/date'
import { recordMap } from '../../../../shared/utils/record'
import { rpcClient } from '../../../api'
import { Amount } from '../../../components/Amount'
import { Percentage } from '../../../components/Percentage'

export const DashboardCardTotalRenderer: React.FC<{
  card: Extract<DashboardCard, { type: 'total' }>
  timetravel?: string
}> = ({ card, timetravel }) => {
  const { data: evaluations } = useSuspenseQuery({
    queryKey: ['dashboardCardTotal', JSON.stringify(card), timetravel],
    queryFn: async () => {
      const now = !timetravel ? new Date() : dateParse(timetravel)
      const raw = await rpcClient
        .evaluateSummary({
          when: {
            type: 'dates',
            dates: [dateStartOf(now, 'day')].map(str => dateFormat(str, 'yyyy-MM-dd')),
          },
          buckets: [{ type: 'all' }],
          values: ['total', 'deposit'],
        })
        .then(r => r.data)
      return {
        ...raw,
        value: recordMap(raw.value, items => {
          return items.map(([date, total, deposit]) => {
            return {
              date: date,
              total: BigNumber(total),
              deposit: BigNumber(deposit),
            }
          })
        }),
      }
    },
  })

  const { total, deposit } = evaluations.value['all'][0]
  const profit = total.minus(deposit)
  const profitPercentage = profit.dividedBy(deposit).multipliedBy(100)

  return (
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
  )
}

const stylesCardTitle = css`
  font-weight: bold;
`

const stylesCardContent = css`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
  padding: var(--spacing-medium);
  align-items: center;
  justify-content: center;
`
