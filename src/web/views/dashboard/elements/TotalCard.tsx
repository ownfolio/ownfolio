import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'

import { rootCurrency } from '../../../../shared/models/Currency'
import { DashboardElementTotalCard } from '../../../../shared/models/Dashboard'
import { dateFormat, dateParse, dateStartOf } from '../../../../shared/utils/date'
import { recordMap } from '../../../../shared/utils/record'
import { rpcClient } from '../../../api'
import { Amount } from '../../../components/Amount'
import { Card } from '../../../components/Card'
import { Input } from '../../../components/Input'
import { Label } from '../../../components/Label'
import { Percentage } from '../../../components/Percentage'
import type { DashboardElementFieldsRendererProps, DashboardElementRendererProps } from './index'

export const TotalCardRenderer: React.FC<DashboardElementRendererProps<DashboardElementTotalCard>> = ({
  element,
  timetravel,
}) => {
  const { data: evaluations } = useSuspenseQuery({
    queryKey: ['dashboardElementTotalCard', timetravel],
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
    <Card>
      <div className={stylesCardContent}>
        {!element.hideTitle && <div className={stylesCardTitle}>Total</div>}
        <div>
          <Amount amount={total} denomination={rootCurrency.denomination} symbol={rootCurrency.symbol} abbreviate />
        </div>
        {!element.hideAbsoluteChange && (
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
        )}
        {!element.hideRelativeChange && (
          <div>
            <Percentage percentage={profitPercentage} decimals={2} signChar signColor signIcon />
          </div>
        )}
      </div>
    </Card>
  )
}

export const TotalCardFieldsRenderer: React.FC<DashboardElementFieldsRendererProps<DashboardElementTotalCard>> = ({
  element,
  onChangeElement,
}) => {
  return (
    <>
      <Label text="Hide title" htmlFor="hideTitle" position="right">
        <Input
          id="hideTitle"
          type="checkbox"
          checked={element.hideTitle}
          onChange={event => onChangeElement({ ...element, hideTitle: event.target.checked })}
        />
      </Label>
      <Label text="Hide absolute change" htmlFor="hideAbsoluteChange" position="right">
        <Input
          id="hideAbsoluteChange"
          type="checkbox"
          checked={element.hideAbsoluteChange}
          onChange={event => onChangeElement({ ...element, hideAbsoluteChange: event.target.checked })}
        />
      </Label>
      <Label text="Hide relative change" htmlFor="hideRelativeChange" position="right">
        <Input
          id="hideRelativeChange"
          type="checkbox"
          checked={element.hideRelativeChange}
          onChange={event => onChangeElement({ ...element, hideRelativeChange: event.target.checked })}
        />
      </Label>
    </>
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
