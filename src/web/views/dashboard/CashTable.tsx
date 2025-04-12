import { useSuspenseQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React from 'react'

import { allCurrencies } from '../../../shared/models/Currency'
import { recordMap } from '../../../shared/utils/record'
import { rpcClient } from '../../api'
import { Amount } from '../../components/Amount'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { useDialogs } from '../../components/DialogsContext'
import { SubText } from '../../components/SubText'
import { AccountDialog } from '../accounts/AccountDialog'
import { TransactionDialog } from '../transactions/TransactionDialog'

export const CashTable: React.FC<{ timetravel?: string }> = ({ timetravel }) => {
  const { openDialog } = useDialogs()
  const { data: portfolios } = useSuspenseQuery({
    queryKey: ['portfolios'],
    queryFn: () => rpcClient.listPortfolios({}).then(r => r.data),
  })
  const { data: accounts } = useSuspenseQuery({
    queryKey: ['accounts'],
    queryFn: () => rpcClient.listAccounts({}).then(r => r.data),
  })
  const { data: evaluations } = useSuspenseQuery({
    queryKey: ['cashTable', 'data', timetravel, accounts.map(a => a.id).join(',')],
    queryFn: async () => {
      const raw = await rpcClient
        .evaluateSummary({
          when: !timetravel ? { type: 'now' } : { type: 'dates', dates: [timetravel] },
          buckets: accounts.filter(a => a.status !== 'hidden').map(a => ({ type: 'account', accountId: a.id })),
          values: ['cash'],
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
  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'account', title: 'Account', minWidth: 150 },
      { id: 'value', title: 'Value', align: 'right', width: 200 },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(() => {
    return accounts
      .filter(a => a.status !== 'hidden')
      .filter(a => !BigNumber(evaluations.value[a.id]?.cash || 0).eq(0))
      .map(account => {
        const accountCurrency = allCurrencies.find(c => c.symbol === account?.currency)
        const portfolio = portfolios.find(p => p.id === account?.portfolioId)
        const id = account.id
        const cashAmount = BigNumber(evaluations.value[account.id]?.cash || 0)
        return {
          id,
          columns: {
            account: (
              <>
                <div>{account?.name || '???'}</div>
                <div>
                  <SubText>{portfolio?.name || '???'}</SubText>
                </div>
              </>
            ),
            value: (
              <Amount
                amount={cashAmount}
                denomination={accountCurrency?.denomination || 0}
                symbol={accountCurrency?.symbol || '???'}
              />
            ),
          },
          menuItems: [
            {
              label: 'Deposit...',
              onClick: async () => {
                await openDialog(TransactionDialog, {
                  mode: {
                    type: 'create',
                    transactionTemplate: {
                      data: {
                        type: 'cashDeposit',
                        cashAccountId: account.id,
                        cashAmount: '',
                      },
                    },
                  },
                })
              },
            },
            {
              label: 'Withdraw...',
              onClick: async () => {
                await openDialog(TransactionDialog, {
                  mode: {
                    type: 'create',
                    transactionTemplate: {
                      data: {
                        type: 'cashWithdrawal',
                        cashAccountId: account.id,
                        cashAmount: '',
                      },
                    },
                  },
                })
              },
            },
            null,
            {
              label: 'Edit account',
              onClick: async () => {
                await openDialog(AccountDialog, { mode: { type: 'edit', accountId: account.id } })
              },
            },
          ],
        }
      })
  }, [portfolios, accounts, evaluations])

  return <CardTable columns={columns} rows={rows} />
}
