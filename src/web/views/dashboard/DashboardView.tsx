import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { rpcClient } from '../../api'
import { Input } from '../../components/Input'
import { LoadingCardSuspense } from '../../components/LoadingCardSuspense'
import { ViewContainer } from '../../components/ViewContainer'
import { DashboardCardsGrid } from './DashboardCards'
import { HoldingsTable } from './HoldingsTable'

export const DashboardView: React.FC = () => {
  const [timetravel, setTimetravel] = React.useState<string | undefined>(undefined)
  const { data: dashboard } = useSuspenseQuery({
    queryKey: ['dashboard', 'default'],
    queryFn: () => rpcClient.retrieveDefaultDashboard().then(r => r.data),
  })
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
      {dashboard.rows.map((row, rowIndex) => {
        switch (row.type) {
          case 'cards':
            return <DashboardCardsGrid key={rowIndex} cards={row.cards} timetravel={timetravel} />
          case 'holdings':
            return (
              <>
                <h2>Holdings</h2>
                <LoadingCardSuspense key={rowIndex}>
                  <HoldingsTable timetravel={timetravel} />
                </LoadingCardSuspense>
              </>
            )
          default:
            return null
        }
      })}
    </ViewContainer>
  )
}

const stylesToolbar = css`
  display: grid;
  gap: var(--spacing-large);
  grid-template-columns: 1fr auto;
`
