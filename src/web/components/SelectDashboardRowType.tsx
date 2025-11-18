import React from 'react'

import { DashboardRowType } from '../../shared/models/Dashboard'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
}

export const SelectDashboardRowType = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable, className, ...other }, ref: any) => {
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'all',
            label: 'Card type',
            options: [
              {
                value: 'headline',
                label: 'Headline',
              },
              {
                value: 'cards',
                label: 'Cards',
              },
            ] satisfies { value: DashboardRowType; label: string }[],
          },
        ],
        emptyLabel,
        clearable,
      }
    }, [])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
