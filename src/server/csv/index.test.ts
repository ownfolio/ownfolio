import { expect, it } from 'vitest'

import { Transaction } from '../../shared/models/Transaction'
import { User } from '../../shared/models/User'
import { Database } from '../database'
import { databaseTest } from '../database/databaseTest'
import { exportTransactionsCsv, importTransactionsCsv } from './index'

it(
  'exportTransactionsCsv/importTransactionCsv',
  databaseTest(async db => {
    await db.init()
    const user1 = await db.users.create({ email: 'user1@domain.com' }, 'password')
    await prepareTransactions(db, user1)
    const csv = await exportTransactionsCsv(db, user1.id)
    const user2 = await db.users.create({ email: 'user2@domain.com' }, 'password')
    await importTransactionsCsv(db, user2.id, csv)
    await expect(db.portfolios.listByUserId(user2.id)).resolves.toHaveLength(1)
    await expect(db.accounts.listByUserId(user2.id)).resolves.toHaveLength(2)
    await expect(db.assets.listByUserId(user2.id)).resolves.toHaveLength(1)

    const accounts1 = await db.accounts.listByUserId(user1.id)
    const accounts2 = await db.accounts.listByUserId(user2.id)
    const assets1 = await db.assets.listByUserId(user1.id)
    const assets2 = await db.assets.listByUserId(user2.id)
    const transactions1 = await db.transactions.listByUserId(user1.id)
    const transactions2 = await db.transactions.listByUserId(user2.id)

    const transactionSanitizer = (tx: Transaction): Transaction => {
      return {
        ...tx,
        id: '',
        createdAt: '',
        userId: user2.id,
      }
    }
    const transactionDataSanitizer = (tx: Transaction): Transaction => {
      return {
        ...tx,
        data: Object.keys(tx.data).reduce(
          (data: any, key) => {
            const value = data[key]
            if (typeof value === 'string' && value.startsWith('act_')) {
              const oldAccount = accounts1.find(a => a.id === value)!
              const newAccount = accounts2.find(a => a.name === oldAccount.name)!
              data[key] = newAccount.id
            }
            if (typeof value === 'string' && value.startsWith('ast_')) {
              const oldAsset = assets1.find(a => a.id === value)!
              const newAsset = assets2.find(a => a.name === oldAsset.name)!
              data[key] = newAsset.id
            }
            return data
          },
          { ...tx.data }
        ),
      }
    }

    expect(transactions2.map(transactionSanitizer)).toEqual(
      transactions1.map(transactionSanitizer).map(transactionDataSanitizer)
    )
  }),
  {
    timeout: 60000,
  }
)

async function prepareTransactions(db: Database, u: User): Promise<User> {
  await db.init()
  const p = await db.portfolios.create({ userId: u.id, name: 'Portfolio' })
  const a1 = await db.accounts.create({
    currency: 'EUR',
    portfolioId: p.id,
    name: 'Account 1',
    number: '',
    status: 'active',
  })
  const a2 = await db.accounts.create({
    currency: 'EUR',
    portfolioId: p.id,
    name: 'Account 2',
    number: '',
    status: 'active',
  })
  const s1 = await db.assets.create({
    userId: u.id,
    name: 'Asset 1',
    number: '',
    symbol: 'S1',
    denomination: 2,
    currency: 'EUR',
    quoteProvider: null,
    status: 'active',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-01',
    time: '00:00:00',
    data: {
      type: 'cashDeposit',
      cashAccountId: a1.id,
      cashAmount: '1',
    },
    reference: 'ref1',
    comment: 'com,"1"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-02',
    time: '00:00:00',
    data: {
      type: 'cashWithdrawal',
      cashAccountId: a1.id,
      cashAmount: '2',
    },
    reference: 'ref2',
    comment: 'com,"2"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-03',
    time: '00:00:00',
    data: {
      type: 'cashTransfer',
      fromCashAccountId: a1.id,
      toCashAccountId: a2.id,
      cashAmount: '3.1',
      feeCashAmount: '3.2',
    },
    reference: 'ref3',
    comment: 'com,"3"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-04',
    time: '00:00:00',
    data: {
      type: 'assetBuy',
      assetAccountId: a2.id,
      assetId: s1.id,
      assetAmount: '4.1',
      cashAccountId: a1.id,
      cashAmount: '4.2',
      feeCashAmount: '4.3',
    },
    reference: 'ref4',
    comment: 'com,"4"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-05',
    time: '00:00:00',
    data: {
      type: 'assetSell',
      assetAccountId: a2.id,
      assetId: s1.id,
      assetAmount: '5.1',
      cashAccountId: a1.id,
      cashAmount: '5.2',
      feeCashAmount: '5.3',
      taxCashAmount: '5.4',
    },
    reference: 'ref5',
    comment: 'c,"5"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-06',
    time: '00:00:00',
    data: {
      type: 'assetDeposit',
      assetAccountId: a1.id,
      assetId: s1.id,
      assetAmount: '6.1',
      cashAmount: '6.2',
    },
    reference: 'ref6',
    comment: 'c,"6"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-07',
    time: '00:00:00',
    data: {
      type: 'assetWithdrawal',
      assetAccountId: a1.id,
      assetId: s1.id,
      assetAmount: '7.1',
      cashAmount: '7.2',
    },
    reference: 'ref7',
    comment: 'c,"7"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-08',
    time: '00:00:00',
    data: {
      type: 'assetTransfer',
      fromAssetAccountId: a1.id,
      toAssetAccountId: a2.id,
      assetId: s1.id,
      assetAmount: '8.1',
      feeAssetAmount: '8.2',
    },
    reference: 'ref8',
    comment: 'c,"8"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-09',
    time: '00:00:00',
    data: {
      type: 'interest',
      cashAccountId: a1.id,
      cashAmount: '9.1',
      taxCashAmount: '9.2',
    },
    reference: 'ref9',
    comment: 'c,"9"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-10',
    time: '00:00:00',
    data: {
      type: 'dividend',
      cashAccountId: a1.id,
      cashAmount: '10.1',
      assetAccountId: a2.id,
      assetId: s1.id,
      assetAmount: '10.2',
      taxCashAmount: '10.3',
    },
    reference: 'ref10',
    comment: 'c,"10"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-11',
    time: '00:00:00',
    data: {
      type: 'tax',
      cashAccountId: a1.id,
      taxCashAmount: '11',
    },
    reference: 'ref11',
    comment: 'c,"11"',
  })
  await db.transactions.create({
    userId: u.id,
    date: '2020-01-12',
    time: '00:00:00',
    data: {
      type: 'fee',
      cashAccountId: a1.id,
      feeCashAmount: '12',
    },
    reference: 'ref12',
    comment: 'c,"12"',
  })
  return u
}
