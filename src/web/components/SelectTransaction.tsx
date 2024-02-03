import { useQuery } from '@tanstack/react-query'
import React from 'react'

import { renderTransactionAsString } from '../../shared/models/Transaction'
import { rpcClient } from '../api'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
}

export const SelectTransaction = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable = false, className, ...other }, ref: any) => {
    const options = useQuery(['transactions'], () => rpcClient.listTransactions({})).data || []
    const accounts = useQuery(['accounts'], () => rpcClient.listAccounts({})).data!
    const assets = useQuery(['assets'], () => rpcClient.listAssets({})).data!
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'all',
            label: 'Transaction',
            options: options.map(o => ({ value: o.id, label: renderTransactionAsString(o, accounts, assets) })),
          },
        ],
        emptyLabel,
        clearable,
      }
    }, [options])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
