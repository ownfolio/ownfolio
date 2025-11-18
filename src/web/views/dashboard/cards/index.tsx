import { css } from '@linaria/core'
import React from 'react'

import { DashboardCard } from '../../../../shared/models/Dashboard'
import { DashboardCardChangeFields, DashboardCardChangeRenderer } from './DashboardCardChange'
import { DashboardCardChartFields, DashboardCardChartRenderer } from './DashboardCardChart'
import { DashboardCardHoldingsFields, DashboardCardHoldingsRenderer } from './DashboardCardHoldings'
import { DashboardCardTotalFields, DashboardCardTotalRenderer } from './DashboardCardTotal'

export type DashboardCardRendererProps<C extends DashboardCard> = { card: C; timetravel?: string }

export const DashboardCardRenderer: React.FC<{ card: DashboardCard; timetravel?: string }> = ({ card, timetravel }) => {
  switch (card.type) {
    case 'total':
      return <DashboardCardTotalRenderer card={card} timetravel={timetravel} />
    case 'change':
      return <DashboardCardChangeRenderer card={card} timetravel={timetravel} />
    case 'chart':
      return <DashboardCardChartRenderer card={card} timetravel={timetravel} />
    case 'holdings':
      return <DashboardCardHoldingsRenderer card={card} timetravel={timetravel} />
    default:
      return <div className={stylesCardContent}>???</div>
  }
}

export type DashboardCardFieldsProps<V> = { value: V; onChange: (value: V) => Promise<void> | void }

export const DashboardCardFields: React.FC<{
  card: DashboardCard
  onChangeCard: (card: DashboardCard) => Promise<void> | void
}> = ({ card, onChangeCard }) => {
  switch (card.type) {
    case 'total':
      return <DashboardCardTotalFields value={card} onChange={onChangeCard} />
    case 'change':
      return <DashboardCardChangeFields value={card} onChange={onChangeCard} />
    case 'chart':
      return <DashboardCardChartFields value={card} onChange={onChangeCard} />
    case 'holdings':
      return <DashboardCardHoldingsFields value={card} onChange={onChangeCard} />
    default:
      return <div className={stylesCardContent}>???</div>
  }
}

const stylesCardContent = css`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
  padding: var(--spacing-medium);
  align-items: center;
  justify-content: center;
`
