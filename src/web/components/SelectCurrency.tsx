import React from 'react'

import { allCurrencies } from '../../shared/models/Currency'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
}

export const SelectCurrency = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable, className, ...other }, ref: any) => {
    const options = allCurrencies.map(currency => ({
      symbol: currency.symbol,
      name: `${currency.name} (${currency.symbol})`,
    }))
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          { id: 'all', label: 'Currency', options: options.map(o => ({ value: o.symbol, label: o.name })) },
        ],
        emptyLabel,
        clearable,
      }
    }, [options])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
