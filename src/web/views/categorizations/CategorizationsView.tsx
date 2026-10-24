import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDialogs } from '../../components/DialogsContext'
import { ViewContainer } from '../../components/ViewContainer'
import { CategorizationDialog } from './CategorizationDialog'

export const CategorizationsView: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const { data: categorizations } = useSuspenseQuery({
    queryKey: ['categorizations'],
    queryFn: () => rpcClient.listCategorizations({}).then(r => r.data),
  })
  const { data: categories } = useSuspenseQuery({
    queryKey: ['categories'],
    queryFn: () => rpcClient.listCategories({}).then(r => r.data),
  })

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'name', title: 'Name', minWidth: 200 },
      { id: 'categories', title: 'Categories', align: 'right', width: 150, priority: 1 },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(
    () =>
      categorizations.map(categorization => {
        return {
          id: categorization.id,
          columns: {
            name: (
              <a
                href="#"
                onClick={event => {
                  event.preventDefault()
                  navigate(`/categorizations/${categorization.id}`)
                }}
              >
                {categorization.name}
              </a>
            ),
            categories: categories.filter(c => c.categorizationId === categorization.id).length,
          },
          menuItems: [
            {
              label: 'Show',
              onClick: () => navigate(`/categorizations/${categorization.id}`),
            },
            {
              label: 'Edit',
              onClick: async () => {
                await openDialog(CategorizationDialog, {
                  mode: { type: 'edit', categorizationId: categorization.id },
                })
              },
            },
            null,
            {
              label: 'Delete',
              onClick: async () => {
                const result = await openDialog(ConfirmationDialog, {
                  question: `Sure that you want to delete the categorization ${categorization.name} with all its categories and assignments? This cannot be undone.`,
                  yesText: `Yes, delete ${categorization.name}!`,
                })
                if (result) {
                  await rpcClient.deleteCategorization({ id: categorization.id })
                  await queryClient.invalidateQueries()
                }
              },
            },
          ],
        }
      }),
    [categorizations, categories]
  )

  return (
    <ViewContainer>
      <div className={stylesToolbar}>
        <Button
          variant="primary"
          onClick={async () => {
            const categorization = await openDialog(CategorizationDialog, { mode: { type: 'create' } })
            if (categorization) {
              navigate(`/categorizations/${categorization.id}`)
            }
          }}
        >
          Create
        </Button>
      </div>
      <CardTable columns={columns} rows={rows} />
    </ViewContainer>
  )
}

const stylesToolbar = css`
  display: grid;
  grid-gap: var(--spacing-large);
  grid-template-columns: 1fr;
`
