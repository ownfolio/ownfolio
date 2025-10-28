import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'

import { rootCurrency } from '../../../../shared/models/Currency'
import { DashboardCard } from '../../../../shared/models/DashboardCard'
import { dateFormat, dateMinus, dateParse, dateStartOf } from '../../../../shared/utils/date'
import { recordMap } from '../../../../shared/utils/record'
import { rpcClient } from '../../../api'
import { Amount } from '../../../components/Amount'
import { Percentage } from '../../../components/Percentage'

export const DashboardCardChangeRenderer: React.FC<{
  card: Extract<DashboardCard, { type: 'change' }>
  timetravel?: string
}> = ({ card, timetravel }) => {
  const { data: evaluations } = useSuspenseQuery({
    queryKey: ['dashboardCardChange', JSON.stringify(card), timetravel],
    queryFn: async () => {
      const now = !timetravel ? new Date() : dateParse(timetravel)
      const raw = await rpcClient
        .evaluateSummary({
          when: {
            type: 'dates',
            dates: [dateMinus(dateStartOf(now, card.since.interval), 'day', 1), dateStartOf(now, 'day')].map(str =>
              dateFormat(str, 'yyyy-MM-dd')
            ),
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

  const { total: totalToday, deposit: depositToday } = evaluations.value['all'][0]
  const { total, deposit } = evaluations.value['all'][1]
  const change = total.minus(deposit).minus(totalToday.minus(depositToday))
  const changePercentage = change.dividedBy(totalToday).multipliedBy(100)
  const title = (() => {
    switch (card.since.interval) {
      case 'day':
        return 'Today'
      case 'week':
        return 'WTD'
      case 'month':
        return 'MTD'
      case 'year':
        return 'YTD'
    }
  })()

  return (
    <div className={stylesCardContent}>
      <div className={stylesCardTitle}>{`Change (${title})`}</div>
      <div>
        <Amount
          amount={change}
          denomination={rootCurrency.denomination}
          symbol={rootCurrency.symbol}
          abbreviate
          signColor
          signChar
          signIcon
        />
      </div>
      <div>
        <Percentage percentage={changePercentage} decimals={2} signChar signColor signIcon />
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
