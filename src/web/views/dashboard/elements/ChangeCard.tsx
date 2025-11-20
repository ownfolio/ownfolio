import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'

import { rootCurrency } from '../../../../shared/models/Currency'
import { DashboardElementChangeCard } from '../../../../shared/models/Dashboard'
import { dateFormat, dateMinus, dateParse, dateStartOf, DateUnit } from '../../../../shared/utils/date'
import { recordMap } from '../../../../shared/utils/record'
import { rpcClient } from '../../../api'
import { Amount } from '../../../components/Amount'
import { Card } from '../../../components/Card'
import { Input } from '../../../components/Input'
import { Label } from '../../../components/Label'
import { Percentage } from '../../../components/Percentage'
import { SelectDateUnit } from '../../../components/SelectDateUnit'
import type { DashboardElementFieldsRendererProps, DashboardElementRendererProps } from './index'

export const ChangeCardRenderer: React.FC<DashboardElementRendererProps<DashboardElementChangeCard>> = ({
  element,
  timetravel,
}) => {
  const { data: evaluations } = useSuspenseQuery({
    queryKey: ['dashboardElementChangeCard', JSON.stringify(element), timetravel],
    queryFn: async () => {
      const now = !timetravel ? new Date() : dateParse(timetravel)
      const raw = await rpcClient
        .evaluateSummary({
          when: {
            type: 'dates',
            dates: [dateMinus(dateStartOf(now, element.since.interval), 'day', 1), dateStartOf(now, 'day')].map(str =>
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
    switch (element.since.interval) {
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
    <Card>
      <div className={stylesCardContent}>
        {!element.hideTitle && <div className={stylesCardTitle}>{`Change (${title})`}</div>}
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
        {!element.hideRelativeChange && (
          <div>
            <Percentage percentage={changePercentage} decimals={2} signChar signColor signIcon />
          </div>
        )}
      </div>
    </Card>
  )
}

export const ChangeCardFieldRenderer: React.FC<DashboardElementFieldsRendererProps<DashboardElementChangeCard>> = ({
  element,
  onChangeElement,
}) => {
  return (
    <>
      <Label text="Since" htmlFor="since">
        <SelectDateUnit
          id="since"
          value={element.since.interval}
          onChange={event =>
            onChangeElement({ ...element, since: { ...element.since, interval: event.target.value as DateUnit } })
          }
          required
        />
      </Label>
      <Label text="Hide title" htmlFor="hideTitle" position="right">
        <Input
          id="hideTitle"
          type="checkbox"
          checked={element.hideTitle}
          onChange={event => onChangeElement({ ...element, hideTitle: event.target.checked })}
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
