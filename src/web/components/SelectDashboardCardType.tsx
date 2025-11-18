import React from 'react'

import { DashboardCardType } from '../../shared/models/Dashboard'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
}

export const SelectDashboardCardType = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable, className, ...other }, ref: any) => {
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'all',
            label: 'Card type',
            options: [
              {
                value: 'total',
                label: 'Total',
              },
              {
                value: 'change',
                label: 'Change',
              },
              {
                value: 'chart',
                label: 'Chart',
              },
              {
                value: 'holdings',
                label: 'Holdings',
              },
            ] satisfies { value: DashboardCardType; label: string }[],
          },
        ],
        emptyLabel,
        clearable,
      }
    }, [])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
