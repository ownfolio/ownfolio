import { css } from '@linaria/core'
import React from 'react'

import { Input } from '../../components/Input'
import { ViewContainer } from '../../components/ViewContainer'
import { AssetClosedPositionsTable } from './AssetClosedPositionsTable'
import { AssetOpenPositionsTable } from './AssetOpenPositionsTable'
import { CashTable } from './CashTable'
import { PortfoliosTable } from './PortfoliosTable'
import { StatCards } from './StatCards'

export const DashboardView: React.FC = () => {
  const [timetravel, setTimetravel] = React.useState<string | undefined>(undefined)
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
      <StatCards timetravel={timetravel} />
      <h2>Portfolios</h2>
      <PortfoliosTable timetravel={timetravel} />
      <h2>Cash</h2>
      <CashTable timetravel={timetravel} />
      <h2>Assets</h2>
      <AssetOpenPositionsTable timetravel={timetravel} />
      <h2>Realized Profits</h2>
      <AssetClosedPositionsTable timetravel={timetravel} />
    </ViewContainer>
  )
}

const stylesToolbar = css`
  display: grid;
  gap: var(--spacing-large);
  grid-template-columns: 1fr auto;
`
