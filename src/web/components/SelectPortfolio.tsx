import { useQuery } from '@tanstack/react-query'
import React from 'react'

import { rpcClient } from '../api'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
}

export const SelectPortfolio = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable, className, ...other }, ref: any) => {
    const options = useQuery(['portfolios'], () => rpcClient.listPortfolios({})).data || []
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [{ id: 'all', label: 'Portfolio', options: options.map(o => ({ value: o.id, label: o.name })) }],
        emptyLabel,
        clearable,
      }
    }, [options])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
