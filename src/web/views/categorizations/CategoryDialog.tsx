import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { Category, createEmptyCategory } from '../../../shared/models/Category'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { SelectCategory } from '../../components/SelectCategory'
import { LoadingView } from '../loading/LoadingView'

type Mode =
  | { type: 'create'; categorizationId: string; parentCategoryId?: string }
  | { type: 'edit'; categorizationId: string; categoryId: string }

interface Props extends DialogContentProps<Category> {
  mode: Mode
}

export const CategoryDialog: React.FC<Props> = ({ mode, closeDialog }) => {
  const queryClient = useQueryClient()
  const { data: categories } = useSuspenseQuery({
    queryKey: ['categories', mode.categorizationId],
    queryFn: () => rpcClient.listCategories({ categorizationId: mode.categorizationId }).then(r => r.data),
  })
  const [category, setCategory] = React.useState<Category | undefined>(undefined)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  React.useEffect(() => {
    if (mode.type === 'create') {
      setCategory({
        ...createEmptyCategory(mode.categorizationId),
        parentCategoryId: mode.parentCategoryId || null,
      })
    } else {
      rpcClient
        .retrieveCategory({ id: mode.categoryId })
        .then(r => r.data)
        .then(setCategory)
        .catch(err => {
          closeDialog(undefined)
          Promise.reject(err)
        })
    }
  }, [])

  // a category cannot be nested below itself or one of its subcategories
  const excludeCategoryIds = React.useMemo(() => {
    if (mode.type !== 'edit') {
      return []
    }
    const result = [mode.categoryId]
    for (let i = 0; i < result.length; i++) {
      result.push(...categories.filter(c => c.parentCategoryId === result[i]).map(c => c.id))
    }
    return result
  }, [categories])

  if (!category) {
    return <LoadingView />
  }

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          const result =
            mode.type === 'create' ? await rpcClient.createCategory(category) : await rpcClient.updateCategory(category)
          await queryClient.invalidateQueries()
          setState('done')
          closeDialog(result.data)
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Name" htmlFor="name">
        <Input
          id="name"
          value={category.name}
          onChange={event => setCategory(category => ({ ...category!, name: event.target.value }))}
          required
          autoFocus
        />
      </Label>
      <Label text="Parent category" htmlFor="parentCategoryId">
        <SelectCategory
          id="parentCategoryId"
          categorizationId={category.categorizationId}
          excludeCategoryIds={excludeCategoryIds}
          value={category.parentCategoryId || ''}
          onChange={event => setCategory(category => ({ ...category!, parentCategoryId: event.target.value || null }))}
          clearable
        />
      </Label>
      <Button type="submit" variant="primary" busy={state === 'busy'} check={state === 'done'} disabled={!!state}>
        Save
      </Button>
      <Button type="reset" onClick={() => closeDialog(undefined)}>
        Cancel
      </Button>
    </Form>
  )
}
