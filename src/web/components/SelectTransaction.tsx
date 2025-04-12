import { useSuspenseQuery } from '@tanstack/react-query'
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
    const { data: options } = useSuspenseQuery({
      queryKey: ['transactions'],
      queryFn: () => rpcClient.listTransactions({}).then(r => r.data),
    })
    const { data: accounts } = useSuspenseQuery({
      queryKey: ['accounts'],
      queryFn: () => rpcClient.listAccounts({}).then(r => r.data),
    })
    const { data: assets } = useSuspenseQuery({
      queryKey: ['assets'],
      queryFn: () => rpcClient.listAssets({}).then(r => r.data),
    })
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'all',
            label: 'Transaction',
            options: options.map(o => ({
              value: o.id,
              label: `${renderTransactionAsString(o, accounts, assets, true)}`,
            })),
          },
        ],
        emptyLabel,
        clearable,
      }
    }, [options])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
