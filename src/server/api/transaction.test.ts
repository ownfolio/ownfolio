// @vitest-environment node
import BigNumber from 'bignumber.js'
import { describe, expect, it } from 'vitest'

import { currencies } from '../../shared/models/Currency'
import { Database } from '../database'
import { databaseTest } from '../database/databaseTest'
import { createRpcV1Transaction } from './transaction'

describe('transaction', () => {
  it(
    'rejects accounts and assets of other users',
    databaseTest(async db => {
      await db.init()
      const u1 = await db.users.create({ email: 'user1@domain.com' }, 'password')
      const u2 = await db.users.create({ email: 'user2@domain.com' }, 'password')
      const api = createRpcV1Transaction(db)
      const ctx = { user: u1, setSessionId: async () => {}, unsetSessionId: async () => {} }
      const [act1, ast1] = await createAccountAndAsset(db, u1.id)
      const [act2, ast2] = await createAccountAndAsset(db, u2.id)
      const template = { date: '2020-01-01', time: '00:00:00', reference: '', comment: '' }
      const assetBuy = (assetAccountId: string, assetId: string, cashAccountId: string) => ({
        ...template,
        data: {
          type: 'assetBuy' as const,
          assetAccountId,
          assetId,
          assetAmount: BigNumber(1),
          cashAccountId,
          cashAmount: BigNumber(100),
          feeCashAmount: BigNumber(0),
        },
      })

      await expect(api.createTransaction.handler(ctx, assetBuy(act2.id, ast1.id, act1.id))).rejects.toThrow(
        `Unknown account ${act2.id}`
      )
      await expect(api.createTransaction.handler(ctx, assetBuy(act1.id, ast1.id, act2.id))).rejects.toThrow(
        `Unknown account ${act2.id}`
      )
      await expect(api.createTransaction.handler(ctx, assetBuy(act1.id, ast2.id, act1.id))).rejects.toThrow(
        `Unknown asset ${ast2.id}`
      )
      await expect(
        api.createTransaction.handler(ctx, {
          ...template,
          data: {
            type: 'cashTransfer',
            fromCashAccountId: act1.id,
            toCashAccountId: act2.id,
            cashAmount: BigNumber(100),
            feeCashAmount: BigNumber(0),
          },
        })
      ).rejects.toThrow(`Unknown account ${act2.id}`)
      await expect(db.transactions.listByUserId(u1.id)).resolves.toEqual([])

      const { data: transaction } = await api.createTransaction.handler(ctx, assetBuy(act1.id, ast1.id, act1.id))
      await expect(
        api.updateTransaction.handler(ctx, { ...transaction, data: assetBuy(act1.id, ast2.id, act1.id).data })
      ).rejects.toThrow(`Unknown asset ${ast2.id}`)
      await expect(db.transactions.find(transaction.id)).resolves.toMatchObject({ data: { assetId: ast1.id } })
    })
  )
})

async function createAccountAndAsset(db: Database, userId: string) {
  const port = await db.portfolios.create({ userId, name: 'Portfolio', status: 'active' })
  const account = await db.accounts.create({
    portfolioId: port.id,
    name: 'Account',
    number: '',
    currency: currencies.EUR.symbol,
    status: 'active',
  })
  const asset = await db.assets.create({
    userId,
    name: 'Asset',
    number: '',
    symbol: 'A',
    denomination: 0,
    currency: currencies.EUR.symbol,
    quoteProvider: null,
    status: 'active',
  })
  return [account, asset] as const
}
