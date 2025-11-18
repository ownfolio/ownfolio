import { css } from '@linaria/core'
import React from 'react'

import { DashboardRow } from '../../../../shared/models/Dashboard'
import { DashboardRowCardsFields, DashboardRowCardsRenderer } from './DashboardRowCards'
import { DashboardRowHeadlineFields, DashboardRowHeadlineRenderer } from './DashboardRowHeadline'

export type DashboardRowRendererProps<R extends DashboardRow> = { row: R; editing?: boolean; timetravel?: string }

export const DashboardRowRenderer: React.FC<{ row: DashboardRow; editing?: boolean; timetravel?: string }> = ({
  row,
  editing,
  timetravel,
}) => {
  switch (row.type) {
    case 'headline':
      return <DashboardRowHeadlineRenderer row={row} editing={editing} timetravel={timetravel} />
    case 'cards':
      return <DashboardRowCardsRenderer row={row} editing={editing} timetravel={timetravel} />
    default:
      return <div className={stylesCardContent}>???</div>
  }
}

export type DashboardRowFieldsProps<V> = { value: V; onChange: (value: V) => Promise<void> | void }

export const DashboardRowFields: React.FC<{
  row: DashboardRow
  onChangeRow: (row: DashboardRow) => Promise<void> | void
}> = ({ row, onChangeRow }) => {
  switch (row.type) {
    case 'headline':
      return <DashboardRowHeadlineFields value={row} onChange={onChangeRow} />
    case 'cards':
      return <DashboardRowCardsFields value={row} onChange={onChangeRow} />
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
