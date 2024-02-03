// @vitest-environment node
import { expect, it } from 'vitest'

import { databaseTest } from './databaseTest'

it(
  'accounts',
  databaseTest(async db => {
    await db.init()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    const p = await db.portfolios.create({ userId: u.id, name: 'Portfolio' })
    await db.accounts.create({ currency: 'EUR', portfolioId: p.id, name: 'Account 1', number: '', status: 'active' })
    await db.accounts.create({ currency: 'EUR', portfolioId: p.id, name: 'Account 2', number: '', status: 'active' })
    await expect(db.accounts.list()).resolves.toHaveLength(2)
    await expect(db.accounts.listByUserId(u.id)).resolves.toHaveLength(2)
    await expect(db.accounts.listByUserId('user_???')).resolves.toHaveLength(0)
  }),
  {
    timeout: 60000,
  }
)
