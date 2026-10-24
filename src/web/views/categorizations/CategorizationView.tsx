import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'
import { useParams } from 'react-router-dom'

import { categoryPath, flattenCategoryTree } from '../../../shared/models/Category'
import { categoryAssignmentTargetKey } from '../../../shared/models/CategoryAssignment'
import { groupBy } from '../../../shared/utils/array'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDialogs } from '../../components/DialogsContext'
import { Percentage } from '../../components/Percentage'
import { SubText } from '../../components/SubText'
import { ViewContainer } from '../../components/ViewContainer'
import { CategoryAssignmentDialog } from './CategoryAssignmentDialog'
import { CategoryDialog } from './CategoryDialog'

export const CategorizationView: React.FC = () => {
  const params = useParams() as { categorizationId: string }
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const { data: categorization } = useSuspenseQuery({
    queryKey: ['categorizations', params.categorizationId],
    queryFn: () => rpcClient.retrieveCategorization({ id: params.categorizationId }).then(r => r.data),
  })
  const { data: categories } = useSuspenseQuery({
    queryKey: ['categories', params.categorizationId],
    queryFn: () => rpcClient.listCategories({ categorizationId: params.categorizationId }).then(r => r.data),
  })
  const { data: assignments } = useSuspenseQuery({
    queryKey: ['categoryAssignments', params.categorizationId],
    queryFn: () => rpcClient.listCategoryAssignments({ categorizationId: params.categorizationId }).then(r => r.data),
  })
  const { data: accounts } = useSuspenseQuery({
    queryKey: ['accounts'],
    queryFn: () => rpcClient.listAccounts({}).then(r => r.data),
  })
  const { data: assets } = useSuspenseQuery({
    queryKey: ['assets'],
    queryFn: () => rpcClient.listAssets({}).then(r => r.data),
  })

  const categoryColumns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'name', title: 'Category', minWidth: 200 },
      { id: 'assignments', title: 'Assignments', align: 'right', width: 150, priority: 1 },
    ],
    []
  )

  const categoryRows = React.useMemo<TableDefinitionRow[]>(
    () =>
      flattenCategoryTree(categories).map(({ category, depth }) => {
        return {
          id: category.id,
          columns: {
            name: <span style={{ paddingLeft: `${depth * 1.5}em` }}>{category.name}</span>,
            assignments: assignments.filter(a => a.categoryId === category.id).length,
          },
          menuItems: [
            {
              label: 'Create subcategory',
              onClick: async () => {
                await openDialog(CategoryDialog, {
                  mode: { type: 'create', categorizationId: categorization.id, parentCategoryId: category.id },
                })
              },
            },
            {
              label: 'Edit',
              onClick: async () => {
                await openDialog(CategoryDialog, {
                  mode: { type: 'edit', categorizationId: categorization.id, categoryId: category.id },
                })
              },
            },
            null,
            {
              label: 'Delete',
              onClick: async () => {
                const result = await openDialog(ConfirmationDialog, {
                  question: `Sure that you want to delete the category ${category.name} with all its subcategories and assignments? This cannot be undone.`,
                  yesText: `Yes, delete ${category.name}!`,
                })
                if (result) {
                  await rpcClient.deleteCategory({ id: category.id })
                  await queryClient.invalidateQueries()
                }
              },
            },
          ],
        }
      }),
    [categorization, categories, assignments]
  )

  const assignmentColumns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'target', title: 'Account / Asset', minWidth: 200 },
      { id: 'categories', title: 'Categories', width: 300, priority: 1 },
    ],
    []
  )

  const assignmentRows = React.useMemo<TableDefinitionRow[]>(
    () =>
      groupBy(assignments, categoryAssignmentTargetKey).map(group => {
        const target = { accountId: group[0].accountId, assetId: group[0].assetId }
        const account = accounts.find(a => a.id === target.accountId)
        const asset = assets.find(a => a.id === target.assetId)
        const undefinedFraction = BigNumber(1).minus(group.reduce((sum, a) => sum.plus(a.fraction), BigNumber(0)))
        return {
          id: categoryAssignmentTargetKey(target),
          columns: {
            target: (
              <>
                <div>{asset?.name || account?.name || '???'}</div>
                <SubText>{!asset ? 'Cash' : !account ? 'In all accounts' : `In account ${account.name}`}</SubText>
              </>
            ),
            categories: (
              <>
                {group.map(a => (
                  <div key={a.id}>
                    {categoryPath(categories, a.categoryId)
                      .map(c => c.name)
                      .join(' / ')}{' '}
                    <SubText>
                      <Percentage percentage={BigNumber(a.fraction).multipliedBy(100)} decimals={2} />
                    </SubText>
                  </div>
                ))}
                {undefinedFraction.isGreaterThan(0) && (
                  <div>
                    <SubText>
                      Undefined <Percentage percentage={undefinedFraction.multipliedBy(100)} decimals={2} />
                    </SubText>
                  </div>
                )}
              </>
            ),
          },
          menuItems: [
            {
              label: 'Edit',
              onClick: async () => {
                await openDialog(CategoryAssignmentDialog, {
                  categorizationId: categorization.id,
                  mode: { type: 'edit', target },
                })
              },
            },
            null,
            {
              label: 'Remove',
              onClick: async () => {
                await rpcClient.setCategoryAssignments({
                  categorizationId: categorization.id,
                  ...target,
                  assignments: [],
                })
                await queryClient.invalidateQueries()
              },
            },
          ],
        }
      }),
    [categorization, categories, assignments, accounts, assets]
  )

  return (
    <ViewContainer>
      <h2>{categorization.name}</h2>
      <div className={stylesToolbar}>
        <Button
          variant="primary"
          onClick={async () => {
            await openDialog(CategoryDialog, { mode: { type: 'create', categorizationId: categorization.id } })
          }}
        >
          Create category
        </Button>
      </div>
      <CardTable columns={categoryColumns} rows={categoryRows} />
      <div className={stylesToolbar}>
        <Button
          variant="primary"
          disabled={categories.length === 0}
          onClick={async () => {
            await openDialog(CategoryAssignmentDialog, {
              categorizationId: categorization.id,
              mode: { type: 'create' },
            })
          }}
        >
          Assign account or asset
        </Button>
      </div>
      <CardTable columns={assignmentColumns} rows={assignmentRows} />
    </ViewContainer>
  )
}

const stylesToolbar = css`
  display: grid;
  grid-gap: var(--spacing-large);
  grid-template-columns: 1fr;
`
