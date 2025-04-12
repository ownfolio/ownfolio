import { css } from '@linaria/core'
import React from 'react'

import { DashboardCard } from '../../../shared/models/DashboardCard'
import { Card } from '../../components/Card'
import { Loading } from '../../components/Loading'
import { DashboardCardChangeRenderer } from './cards/DashboardCardChangeRenderer'
import { DashboardCardChartRenderer } from './cards/DashboardCardChartRenderer'
import { DashboardCardTotalRenderer } from './cards/DashboardCardTotalRenderer'

export const DashboardCardsGrid: React.FC<{ cards: DashboardCard[]; timetravel?: string }> = ({
  cards,
  timetravel,
}) => {
  return (
    <div className={stylesGrid}>
      {cards.map((card, index) => (
        <Card key={index} className={stylesCard}>
          <React.Suspense
            fallback={
              <div className={stylesCardContent}>
                <Loading />
              </div>
            }
          >
            <DashboardCardRenderer card={card} timetravel={timetravel} />
          </React.Suspense>
        </Card>
      ))}
    </div>
  )
}

export const DashboardCardRenderer: React.FC<{ card: DashboardCard; timetravel?: string }> = ({ card, timetravel }) => {
  switch (card.type) {
    case 'total':
      return <DashboardCardTotalRenderer card={card} timetravel={timetravel} />
    case 'change':
      return <DashboardCardChangeRenderer card={card} timetravel={timetravel} />
    case 'chart':
      return <DashboardCardChartRenderer card={card} timetravel={timetravel} />
    default:
      return <div className={stylesCardContent}>???</div>
  }
}

const stylesGrid = css`
  display: grid;
  gap: var(--spacing-large);
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
`

const stylesCard = css`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  overflow: hidden;
`

const stylesCardContent = css`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
  padding: var(--spacing-medium);
  align-items: center;
  justify-content: center;
`
