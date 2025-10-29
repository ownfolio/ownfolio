import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { Account } from '../../../shared/models/Account'
import { currenciesList } from '../../../shared/models/Currency'
import {
  createEmptyTransaction,
  Transaction,
  TransactionData,
  TransactionSearch,
} from '../../../shared/models/Transaction'
import { rpcClient } from '../../api'
import { Amount } from '../../components/Amount'
import { Button } from '../../components/Button'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDialogs } from '../../components/DialogsContext'
import { SelectAccount } from '../../components/SelectAccount'
import { SelectAsset } from '../../components/SelectAsset'
import { SelectPortfolio } from '../../components/SelectPortfolio'
import { SubText } from '../../components/SubText'
import { ViewContainer } from '../../components/ViewContainer'
import { AccountDialog } from '../accounts/AccountDialog'
import { TransactionDialog } from './TransactionDialog'

export const TransactionsView: React.FC = () => {
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const [search, setSearch] = React.useState<TransactionSearch>({})
  const [top, setTop] = React.useState(100)
  const { data: transactions } = useSuspenseQuery({
    queryKey: ['transactions', search, 0, top],
    queryFn: () => rpcClient.listTransactions({ ...search, skip: 0, top }).then(r => r.data),
  })

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'date', title: 'Date', width: 125 },
      { id: 'data', title: 'Data', minWidth: 400, className: stylesDataColumn },
      { id: 'reference', title: 'Reference', width: 200, priority: 2, className: stylesReferenceColumn },
      { id: 'comment', title: 'Comment', width: 200, priority: 2, className: stylesCommentColumn },
      { id: 'links', title: 'Links', width: 80, align: 'right', priority: 3 },
    ],
    []
  )
  const menuItems = React.useCallback(
    (tx: Transaction) => [
      {
        label: 'Edit',
        onClick: async () => {
          await openDialog(TransactionDialog, { mode: { type: 'edit', transactionId: tx.id } })
        },
      },
      {
        label: 'Duplicate',
        onClick: async () => {
          await openDialog(TransactionDialog, {
            mode: {
              type: 'create',
              transactionTemplate: {
                ...createEmptyTransaction(),
                date: tx.date,
                time: tx.time,
                data: tx.data,
                comment: tx.comment,
              },
            },
          })
        },
      },
      null,
      {
        label: 'Delete',
        onClick: async () => {
          const result = await openDialog(ConfirmationDialog, {
            question: `Sure that you want to delete this transaction? This cannot be undone.`,
            yesText: `Yes, delete it!`,
          })
          if (result) {
            await rpcClient.deleteTransaction({ id: tx.id })
            await queryClient.invalidateQueries()
          }
        },
      },
    ],
    []
  )
  const rows = React.useMemo<TableDefinitionRow[]>(() => {
    return transactions.map(tx => {
      return {
        id: tx.id,
        columns: {
          date: (
            <>
              <div>{tx.date}</div>
              {tx.time !== '00:00:00' && (
                <div>
                  <SubText>{tx.time}</SubText>
                </div>
              )}
            </>
          ),
          data: <TransactionDataText data={tx.data} />,
          reference: tx.reference,
          comment: tx.comment,
          links: tx.attachmentIds.length.toString(),
        },
        menuItems: menuItems(tx),
      }
    })
  }, [transactions])

  return (
    <ViewContainer>
      <div className={stylesToolbar}>
        <Button
          variant="primary"
          onClick={async () => {
            await openDialog(TransactionDialog, {
              mode: {
                type: 'create',
                transactionTemplate: {
                  ...createEmptyTransaction(),
                  data: {} as any,
                },
              },
            })
          }}
        >
          Create
        </Button>
        <SelectPortfolio
          value={search.portfolioId || ''}
          onChange={event => setSearch(search => ({ ...search, portfolioId: event.target.value || undefined }))}
          emptyLabel="All portfolios"
          clearable
        />
        <SelectAccount
          value={search.accountId || ''}
          onChange={event => setSearch(search => ({ ...search, accountId: event.target.value || undefined }))}
          emptyLabel="All accounts"
          clearable
          showInactiveAndHidden
        />
        <SelectAsset
          value={search.assetId || ''}
          onChange={event => setSearch(search => ({ ...search, assetId: event.target.value || undefined }))}
          emptyLabel="All assets"
          clearable
          showInactiveAndHidden
        />
      </div>
      <CardTable columns={columns} rows={rows} />
      {transactions.length === top && (
        <a
          href="#"
          onClick={event => {
            event.preventDefault()
            setTop(top => top + 100)
          }}
        >
          Show more...
        </a>
      )}
    </ViewContainer>
  )
}

const AccountLink: React.FC<{ account?: Account }> = ({ account }) => {
  const { openDialog } = useDialogs()
  return account ? (
    <a
      href="#"
      onClick={event => {
        event.preventDefault()
        openDialog(AccountDialog, { mode: { type: 'edit', accountId: account.id } })
      }}
      className={stylesLink}
    >
      {account.name}
    </a>
  ) : (
    <span>???</span>
  )
}

const TransactionDataText: React.FC<{ data: TransactionData }> = ({ data }): React.ReactElement => {
  const { data: accounts } = useSuspenseQuery({
    queryKey: ['accounts'],
    queryFn: () => rpcClient.listAccounts({}).then(r => r.data),
  })
  const { data: assets } = useSuspenseQuery({
    queryKey: ['assets'],
    queryFn: () => rpcClient.listAssets({}).then(r => r.data),
  })

  switch (data.type) {
    case 'cashDeposit': {
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        <div>
          Deposit{' '}
          <Amount
            amount={data.cashAmount}
            symbol={currency?.symbol || '???'}
            denomination={currency?.denomination || 0}
            className={stylesAmount}
          />{' '}
          to <AccountLink account={cashAccount} />
        </div>
      )
    }
    case 'cashWithdrawal': {
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        <div>
          Withdraw{' '}
          <Amount
            amount={data.cashAmount}
            symbol={currency?.symbol || '???'}
            denomination={currency?.denomination || 0}
            className={stylesAmount}
          />{' '}
          from <AccountLink account={cashAccount} />
        </div>
      )
    }
    case 'cashTransfer': {
      const fromCashAccount = accounts.find(a => a.id === data.fromCashAccountId)
      const toCashAccount = accounts.find(a => a.id === data.toCashAccountId)
      const currency = currenciesList.find(c => c.symbol === fromCashAccount?.currency)
      return (
        <div>
          Transfer{' '}
          <Amount
            amount={data.cashAmount}
            symbol={currency?.symbol || '???'}
            denomination={currency?.denomination || 0}
            className={stylesAmount}
          />{' '}
          from <AccountLink account={fromCashAccount} /> to <AccountLink account={toCashAccount} />
        </div>
      )
    }
    case 'assetBuy': {
      const asset = assets.find(a => a.id === data.assetId)
      const assetAccount = accounts.find(a => a.id === data.assetAccountId)
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        <div>
          Buy{' '}
          <Amount
            amount={data.assetAmount}
            symbol={asset?.symbol || '???'}
            denomination={asset?.denomination || 0}
            className={stylesAmount}
          />{' '}
          on <AccountLink account={assetAccount} /> for{' '}
          <Amount
            amount={data.cashAmount}
            symbol={currency?.symbol || '???'}
            denomination={currency?.denomination || 0}
            className={stylesAmount}
          />{' '}
          on <AccountLink account={cashAccount} />
        </div>
      )
    }
    case 'assetSell': {
      const asset = assets.find(a => a.id === data.assetId)
      const assetAccount = accounts.find(a => a.id === data.assetAccountId)
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        <div>
          Sell{' '}
          <Amount
            amount={data.assetAmount}
            symbol={asset?.symbol || '???'}
            denomination={asset?.denomination || 0}
            className={stylesAmount}
          />{' '}
          on <AccountLink account={assetAccount} /> for{' '}
          <Amount
            amount={data.cashAmount}
            symbol={currency?.symbol || '???'}
            denomination={currency?.denomination || 0}
            className={stylesAmount}
          />{' '}
          on <AccountLink account={cashAccount} />
        </div>
      )
    }
    case 'assetDeposit': {
      const asset = assets.find(a => a.id === data.assetId)
      const assetAccount = accounts.find(a => a.id === data.assetAccountId)
      return (
        <div>
          Deposit{' '}
          <Amount
            amount={data.assetAmount}
            symbol={asset?.symbol || '???'}
            denomination={asset?.denomination || 0}
            className={stylesAmount}
          />{' '}
          to <AccountLink account={assetAccount} />
        </div>
      )
    }
    case 'assetWithdrawal': {
      const asset = assets.find(a => a.id === data.assetId)
      const assetAccount = accounts.find(a => a.id === data.assetAccountId)
      return (
        <div>
          Withdraw{' '}
          <Amount
            amount={data.assetAmount}
            symbol={asset?.symbol || '???'}
            denomination={asset?.denomination || 0}
            className={stylesAmount}
          />{' '}
          from <AccountLink account={assetAccount} />
        </div>
      )
    }
    case 'assetTransfer': {
      const asset = assets.find(a => a.id === data.assetId)
      const fromAssetAccount = accounts.find(a => a.id === data.fromAssetAccountId)
      const toAssetAccount = accounts.find(a => a.id === data.toAssetAccountId)
      return (
        <div>
          Transfer{' '}
          <Amount
            amount={data.assetAmount}
            symbol={asset?.symbol || '???'}
            denomination={asset?.denomination || 0}
            className={stylesAmount}
          />{' '}
          from <AccountLink account={fromAssetAccount} /> to <AccountLink account={toAssetAccount} />
        </div>
      )
    }
    case 'interest': {
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        <div>
          Receive{' '}
          <Amount
            amount={data.cashAmount}
            symbol={currency?.symbol || '???'}
            denomination={currency?.denomination || 0}
            className={stylesAmount}
          />{' '}
          interest to <AccountLink account={cashAccount} />
        </div>
      )
    }
    case 'dividend': {
      const asset = assets.find(a => a.id === data.assetId)
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        <div>
          Receive{' '}
          <Amount
            amount={data.cashAmount}
            symbol={currency?.symbol || '???'}
            denomination={currency?.denomination || 0}
            className={stylesAmount}
          />{' '}
          dividend to <AccountLink account={cashAccount} /> for{' '}
          <Amount amount={data.assetAmount} symbol={asset?.symbol || '???'} denomination={asset?.denomination || 0} />
        </div>
      )
    }
    case 'tax': {
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        <div>
          Pay{' '}
          <Amount
            amount={data.taxCashAmount}
            symbol={currency?.symbol || '???'}
            denomination={currency?.denomination || 0}
            className={stylesAmount}
          />{' '}
          tax from <AccountLink account={cashAccount} />
        </div>
      )
    }
    case 'fee': {
      const cashAccount = accounts.find(a => a.id === data.cashAccountId)
      const currency = currenciesList.find(c => c.symbol === cashAccount?.currency)
      return (
        <div>
          Pay{' '}
          <Amount
            amount={data.feeCashAmount}
            symbol={currency?.symbol || '???'}
            denomination={currency?.denomination || 0}
            className={stylesAmount}
          />{' '}
          fee from <AccountLink account={cashAccount} />
        </div>
      )
    }
  }
}

const stylesToolbar = css`
  display: grid;
  grid-gap: var(--spacing-large);
  grid-template-columns: repeat(4, 1fr);
  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`

const stylesDataColumn = css`
  word-break: break-word;
`

const stylesReferenceColumn = css`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`

const stylesCommentColumn = css`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`

const stylesAmount = css`
  color: var(--color-primary);
`

const stylesLink = css`
  color: var(--color-secondary);
`
