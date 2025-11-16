import { useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'

import { recordMap } from '../../../shared/utils/record'
import { rpcClient } from '../../api'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'

export const ClassificationTable: React.FC<{ timetravel?: string }> = ({ timetravel }) => {
  const { data: portfolios } = useSuspenseQuery({
    queryKey: ['portfolios'],
    queryFn: () => rpcClient.listPortfolios({}).then(r => r.data),
  })
  const { data: accounts } = useSuspenseQuery({
    queryKey: ['accounts'],
    queryFn: () => rpcClient.listAccounts({}).then(r => r.data),
  })
  const { data: assets } = useSuspenseQuery({
    queryKey: ['assets'],
    queryFn: () => rpcClient.listAssets({}).then(r => r.data),
  })
  const { data: classifications } = useSuspenseQuery({
    queryKey: ['classifications'],
    queryFn: () => rpcClient.listClassifications({}).then(r => r.data),
  })
  const { data: evaluations } = useSuspenseQuery({
    queryKey: ['cashTable', 'data', timetravel, accounts.map(a => a.id).join(',')],
    queryFn: async () => {
      const raw = await rpcClient
        .evaluateSummary({
          when: !timetravel ? { type: 'now' } : { type: 'dates', dates: [timetravel] },
          buckets: classifications
            .filter(c => c.status !== 'hidden')
            .map(c => ({ type: 'classification', classificationId: c.id })),
          values: ['cash', 'total'],
        })
        .then(r => r.data)
      return {
        ...raw,
        value: recordMap(raw.value, items => {
          const [date, cash] = items[0]
          return {
            date: date,
            cash: BigNumber(cash),
          }
        }),
      }
    },
  })
  const columns = React.useMemo<TableDefinitionColumn[]>(() => [{ id: 'name', title: 'Name', minWidth: 150 }], [])

  const rows = React.useMemo<TableDefinitionRow[]>(() => {
    return classifications
      .filter(c => !c.parentClassificationId)
      .flatMap(classification => {
        const id = classification.id

        const subClassificationIdsRecursion = (id: string): string[] => {
          return [
            id,
            ...classifications
              .filter(c => c.parentClassificationId === id)
              .map(c => c.id)
              .flatMap(subClassificationIdsRecursion),
          ]
        }
        const subClassificationIds = subClassificationIdsRecursion(id)

        console.log(id, subClassificationIds)

        if (classification.status === 'hidden') {
          return []
        }

        return [
          {
            id,
            columns: {
              name: classification.name,
            },
            subRows: classifications
              .filter(c => c.parentClassificationId === classification.id)
              .flatMap(subClassification => {
                const id = subClassification.id

                if (subClassification.status === 'hidden') {
                  return []
                }

                return [
                  {
                    id,
                    columns: {
                      name: subClassification.name,
                    },
                  },
                ]
              }),
          },
        ]
      })
  }, [portfolios, accounts, assets, classifications, evaluations])

  return <CardTable columns={columns} rows={rows} />
}
