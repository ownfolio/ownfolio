import React from 'react'

import { DateUnit } from '../../shared/utils/date'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
}

export const SelectDateUnit = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable, className, ...other }, ref: any) => {
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'all',
            label: 'Interval',
            options: [
              {
                value: 'day',
                label: 'Day',
              },
              {
                value: 'week',
                label: 'Week',
              },
              {
                value: 'month',
                label: 'Month',
              },
              {
                value: 'year',
                label: 'Year',
              },
            ] satisfies { value: DateUnit; label: string }[],
          },
        ],
        emptyLabel,
        clearable,
      }
    }, [])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
