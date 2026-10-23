// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { currencies } from '../../shared/models/Currency'
import { databaseTest } from '../database/databaseTest'
import { createRpcV1Account } from './account'

describe('account', () => {
  it(
    'rejects portfolios of other users',
    databaseTest(async db => {
      await db.init()
      const u1 = await db.users.create({ email: 'user1@domain.com' }, 'password')
      const u2 = await db.users.create({ email: 'user2@domain.com' }, 'password')
      const api = createRpcV1Account(db)
      const ctx = { user: u1, setSessionId: async () => {}, unsetSessionId: async () => {} }
      const port1 = await db.portfolios.create({ userId: u1.id, name: 'Portfolio 1', status: 'active' })
      const port2 = await db.portfolios.create({ userId: u2.id, name: 'Portfolio 2', status: 'active' })
      const template = { name: 'Account', number: '', currency: currencies.EUR.symbol, status: 'active' as const }

      await expect(api.createAccount.handler(ctx, { ...template, portfolioId: port2.id })).rejects.toThrow(
        `Unknown portfolio ${port2.id}`
      )
      await expect(db.accounts.listByUserId(u2.id)).resolves.toEqual([])

      const { data: account } = await api.createAccount.handler(ctx, { ...template, portfolioId: port1.id })
      await expect(api.updateAccount.handler(ctx, { ...account, portfolioId: port2.id })).rejects.toThrow(
        `Unknown portfolio ${port2.id}`
      )
      await expect(db.accounts.find(account.id)).resolves.toMatchObject({ portfolioId: port1.id })
    })
  )
})
