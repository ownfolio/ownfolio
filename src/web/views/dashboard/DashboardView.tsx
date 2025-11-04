import { css } from '@linaria/core'
import React from 'react'

import { DashboardCard } from '../../../shared/models/DashboardCard'
import { Input } from '../../components/Input'
import { LoadingCardSuspense } from '../../components/LoadingCardSuspense'
import { ViewContainer } from '../../components/ViewContainer'
import { DashboardCardsGrid } from './DashboardCards'
import { HoldingsTable } from './HoldingsTable'

export const DashboardView: React.FC = () => {
  const [timetravel, setTimetravel] = React.useState<string | undefined>(undefined)
  const cards: DashboardCard[] = [
    { type: 'total' },
    { type: 'chart', config: { type: 'profit', resolution: 'week', range: 'month', rangeAmount: 6 } },
    { type: 'change', since: { type: 'toDate', interval: 'day' } },
    { type: 'change', since: { type: 'toDate', interval: 'month' } },
    { type: 'change', since: { type: 'toDate', interval: 'year' } },
  ]
  return (
    <ViewContainer>
      <div className={stylesToolbar}>
        <div />
        <Input
          type="date"
          value={timetravel || ''}
          onChange={event => setTimetravel(event.target.value || undefined)}
        />
      </div>
      <DashboardCardsGrid cards={cards} timetravel={timetravel} />
      <h2>Holdings</h2>
      <LoadingCardSuspense>
        <HoldingsTable timetravel={timetravel} />
      </LoadingCardSuspense>
    </ViewContainer>
  )
}

const stylesToolbar = css`
  display: grid;
  gap: var(--spacing-large);
  grid-template-columns: 1fr auto;
`
