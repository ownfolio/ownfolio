import { useQuery } from '@tanstack/react-query'
import React from 'react'

import { rpcClient } from '../api'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  emptyLabel?: string
  clearable?: boolean
  showInactiveAndHidden?: boolean
}

export const SelectAttachment = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, emptyLabel = '-', clearable, showInactiveAndHidden = false, className, ...other }, ref: any) => {
    const options = useQuery(['attachments'], () => rpcClient.listAttachments({})).data || []
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'all',
            label: 'Attachment',
            options: options.map(o => ({ value: o.id, label: o.fileName })),
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
