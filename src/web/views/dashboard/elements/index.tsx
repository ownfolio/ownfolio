import { css } from '@linaria/core'
import React from 'react'

import { DashboardElement } from '../../../../shared/models/Dashboard'
import { ChangeCardFieldRenderer, ChangeCardRenderer } from './ChangeCard'
import { ChartCardFieldsRenderer, ChartCardRenderer } from './ChartCard'
import { HoldingsTableCardFieldsRenderer, HoldingsTableCardRenderer } from './HoldingsTableCard'
import { TotalCardFieldsRenderer, TotalCardRenderer } from './TotalCard'

export type DashboardElementRendererProps<E extends DashboardElement> = { element: E; timetravel?: string }

export const DashboardElementRenderer: React.FC<DashboardElementRendererProps<DashboardElement>> = ({
  element,
  timetravel,
}) => {
  switch (element.type) {
    case 'totalCard':
      return <TotalCardRenderer element={element} timetravel={timetravel} />
    case 'changeCard':
      return <ChangeCardRenderer element={element} timetravel={timetravel} />
    case 'chartCard':
      return <ChartCardRenderer element={element} timetravel={timetravel} />
    case 'holdingsTableCard':
      return <HoldingsTableCardRenderer element={element} timetravel={timetravel} />
    default:
      return <div className={stylesElementContent}>???</div>
  }
}

export type DashboardElementFieldsRendererProps<E extends DashboardElement> = {
  element: E
  onChangeElement: (value: E) => Promise<void> | void
}

export const DashboardElementFieldsRenderer: React.FC<DashboardElementFieldsRendererProps<DashboardElement>> = ({
  element,
  onChangeElement,
}) => {
  switch (element.type) {
    case 'totalCard':
      return <TotalCardFieldsRenderer element={element} onChangeElement={onChangeElement} />
    case 'changeCard':
      return <ChangeCardFieldRenderer element={element} onChangeElement={onChangeElement} />
    case 'chartCard':
      return <ChartCardFieldsRenderer element={element} onChangeElement={onChangeElement} />
    case 'holdingsTableCard':
      return <HoldingsTableCardFieldsRenderer element={element} onChangeElement={onChangeElement} />
    default:
      return <div className={stylesElementContent}>???</div>
  }
}

const stylesElementContent = css`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
  padding: var(--spacing-medium);
  align-items: center;
  justify-content: center;
`
