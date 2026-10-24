import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'

import { CategoryAssignment, CategoryAssignmentTarget } from '../../../shared/models/CategoryAssignment'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { BigNumberInput } from '../../components/Input'
import { Label } from '../../components/Label'
import { Percentage } from '../../components/Percentage'
import { SelectAccount } from '../../components/SelectAccount'
import { SelectAsset } from '../../components/SelectAsset'
import { SelectCategory } from '../../components/SelectCategory'

type Mode = { type: 'create' } | { type: 'edit'; target: CategoryAssignmentTarget }

interface Props extends DialogContentProps<CategoryAssignment[]> {
  categorizationId: string
  mode: Mode
}

interface Row {
  categoryId: string
  percentage: BigNumber
}

export const CategoryAssignmentDialog: React.FC<Props> = ({ categorizationId, mode, closeDialog }) => {
  const queryClient = useQueryClient()
  const { data: existingAssignments } = useSuspenseQuery({
    queryKey: ['categoryAssignments', categorizationId],
    queryFn: () => rpcClient.listCategoryAssignments({ categorizationId }).then(r => r.data),
  })
  const [target, setTarget] = React.useState<CategoryAssignmentTarget>(
    mode.type === 'edit' ? mode.target : { accountId: null, assetId: null }
  )
  const [rows, setRows] = React.useState<Row[]>([])
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  // start with the current assignments of the selected target, so that they get edited instead of overwritten
  React.useEffect(() => {
    setRows(
      existingAssignments
        .filter(a => a.accountId === target.accountId && a.assetId === target.assetId)
        .map(a => ({ categoryId: a.categoryId, percentage: BigNumber(a.fraction).multipliedBy(100) }))
    )
  }, [target.accountId, target.assetId])

  const totalPercentage = rows.reduce((sum, row) => sum.plus(row.percentage), BigNumber(0))
  const setRow = (index: number, row: Row) => setRows(rows => rows.map((r, i) => (i === index ? row : r)))

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          const result = await rpcClient.setCategoryAssignments({
            categorizationId,
            accountId: target.accountId,
            assetId: target.assetId,
            assignments: rows.map(row => ({ categoryId: row.categoryId, fraction: row.percentage.dividedBy(100) })),
          })
          await queryClient.invalidateQueries()
          setState('done')
          closeDialog(result.data)
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Account" htmlFor="accountId" addition="Without asset this means the cash on the account">
        <SelectAccount
          id="accountId"
          value={target.accountId || ''}
          onChange={event => setTarget(target => ({ ...target, accountId: event.target.value || null }))}
          disabled={mode.type === 'edit'}
          required={!target.assetId}
          clearable
          autoFocus
        />
      </Label>
      <Label text="Asset" htmlFor="assetId" addition="Without account this applies to the asset in all accounts">
        <SelectAsset
          id="assetId"
          value={target.assetId || ''}
          onChange={event => setTarget(target => ({ ...target, assetId: event.target.value || null }))}
          disabled={mode.type === 'edit'}
          required={!target.accountId}
          clearable
        />
      </Label>
      {rows.map((row, index) => (
        <div key={index} className={stylesRow}>
          <Label text="Category" htmlFor={`categoryId-${index}`}>
            <SelectCategory
              id={`categoryId-${index}`}
              categorizationId={categorizationId}
              excludeCategoryIds={rows.filter((_, i) => i !== index).map(r => r.categoryId)}
              value={row.categoryId}
              onChange={event => setRow(index, { ...row, categoryId: event.target.value })}
              required
            />
          </Label>
          <Label text="Percentage" htmlFor={`percentage-${index}`}>
            <BigNumberInput
              id={`percentage-${index}`}
              value={row.percentage}
              onValueChange={percentage => setRow(index, { ...row, percentage })}
              required
            />
          </Label>
          <Button type="button" onClick={() => setRows(rows => rows.filter((_, i) => i !== index))}>
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        onClick={() =>
          setRows(rows => [
            ...rows,
            { categoryId: '', percentage: BigNumber.max(BigNumber(100).minus(totalPercentage), 0) },
          ])
        }
      >
        Add category
      </Button>
      <div>
        Undefined: <Percentage percentage={BigNumber(100).minus(totalPercentage)} decimals={2} />
      </div>
      <Button
        type="submit"
        variant="primary"
        busy={state === 'busy'}
        check={state === 'done'}
        disabled={!!state || (!target.accountId && !target.assetId) || totalPercentage.isGreaterThan(100)}
      >
        Save
      </Button>
      <Button type="reset" onClick={() => closeDialog(undefined)}>
        Cancel
      </Button>
    </Form>
  )
}

const stylesRow = css`
  display: grid;
  grid-gap: var(--spacing-medium);
  grid-template-columns: 1fr 120px auto;
  align-items: end;
`
