import React from 'react'

import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
}

export const SelectQuoteProvider = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable, className, ...other }, ref: any) => {
    const options = [{ type: 'yahooFinance', name: 'Yahoo Finance' }]
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          { id: 'all', label: 'Quote Provider', options: options.map(o => ({ value: o.type, label: o.name })) },
        ],
        emptyLabel,
        clearable,
      }
    }, [options])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
