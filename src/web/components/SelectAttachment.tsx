import { useQuery } from '@tanstack/react-query'
import React from 'react'

import { rpcClient } from '../api'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
}

export const SelectAttachment = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable = false, className, ...other }, ref: any) => {
    const options = useQuery(['attachments'], () => rpcClient.listAttachments({}).then(r => r.data)).data!
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'all',
            label: 'Attachment',
            options: options.map(o => ({ value: o.id, label: o.fileName })),
          },
        ],
        emptyLabel,
        clearable,
      }
    }, [options])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
