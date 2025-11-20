import React from 'react'

import { DashboardElementType } from '../../shared/models/Dashboard'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
}

export const SelectDashboardElementType = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable, className, ...other }, ref: any) => {
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'all',
            label: 'Element type',
            options: [
              {
                value: 'text',
                label: 'Text',
              },
              {
                value: 'totalCard',
                label: 'Total card',
              },
              {
                value: 'changeCard',
                label: 'Change card',
              },
              {
                value: 'chartCard',
                label: 'Chart card',
              },
              {
                value: 'holdingsTableCard',
                label: 'Holdings table card',
              },
            ] satisfies { value: DashboardElementType; label: string }[],
          },
        ],
        emptyLabel,
        clearable,
      }
    }, [])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
