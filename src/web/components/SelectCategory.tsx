import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { flattenCategoryTree } from '../../shared/models/Category'
import { rpcClient } from '../api'
import { Select } from './Select'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  categorizationId: string
  excludeCategoryIds?: string[]
  emptyLabel?: string
  clearable?: boolean
}

export const SelectCategory = React.forwardRef<HTMLSelectElement, Props>(
  ({ categorizationId, excludeCategoryIds = [], value, onChange, emptyLabel = '-', clearable, ...other }, ref: any) => {
    const { data: categories } = useSuspenseQuery({
      queryKey: ['categories', categorizationId],
      queryFn: () => rpcClient.listCategories({ categorizationId }).then(r => r.data),
    })
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'categories',
            label: 'Category',
            options: flattenCategoryTree(categories)
              .filter(n => !excludeCategoryIds.includes(n.category.id))
              .map(n => ({ value: n.category.id, label: '  '.repeat(n.depth) + n.category.name })),
          },
        ],
        emptyLabel,
        clearable,
      }
    }, [categories, excludeCategoryIds.join(',')])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)
