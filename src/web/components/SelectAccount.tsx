import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { rpcClient } from '../api'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
  showInactiveAndHidden?: boolean
}

export const SelectAccount = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable, showInactiveAndHidden = false, className, ...other }, ref: any) => {
    const { data: options } = useSuspenseQuery({
      queryKey: ['accounts'],
      queryFn: () => rpcClient.listAccounts({}).then(r => r.data),
    })
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'active',
            label: 'Account',
            options: options.filter(o => o.status === 'active').map(o => ({ value: o.id, label: o.name })),
          },
          {
            id: 'inactive',
            label: 'Inactive',
            options: options.filter(o => o.status === 'inactive').map(o => ({ value: o.id, label: o.name })),
          },
          {
            id: 'hidden',
            label: 'Hidden',
            options: options.filter(o => o.status === 'hidden').map(o => ({ value: o.id, label: o.name })),
          },
        ],
        hiddenGroups: !showInactiveAndHidden ? ['inactive', 'hidden'] : [],
        emptyLabel,
        clearable,
      }
    }, [options])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
