// @vitest-environment node
import { expect, it } from 'vitest'

import { databaseTest } from './databaseTest'

it(
  'assets',
  databaseTest(async db => {
    await db.init()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    await db.assets.create({
      userId: u.id,
      name: 'Asset 1',
      number: '',
      symbol: 'S1',
      denomination: 2,
      currency: 'EUR',
      quoteProvider: null,
      status: 'active',
    })
    await db.assets.create({
      userId: u.id,
      name: 'Asset 2',
      number: '',
      symbol: 'S2',
      denomination: 2,
      currency: 'EUR',
      quoteProvider: null,
      status: 'active',
    })
    await expect(db.assets.list(0, 100)).resolves.toHaveLength(2)
    await expect(db.assets.listByUserId(u.id)).resolves.toHaveLength(2)
    await expect(db.assets.listByUserId('user_???')).resolves.toHaveLength(0)

    const a3 = await db.assets.create({
      userId: u.id,
      name: 'Asset 3',
      number: '',
      symbol: 'S3',
      denomination: 2,
      currency: 'EUR',
      quoteProvider: null,
      status: 'active',
    })
    await expect(db.assets.retrieve(a3.id).then(a => a.quoteProvider)).resolves.toBe(null)
    await db.assets.updateQuoteProvider(a3.id, {
      type: 'yahooFinance',
      symbol: '???',
      pauseUntil: null,
    })
    await expect(db.assets.retrieve(a3.id).then(a => a.quoteProvider)).resolves.not.toBe(null)
  }),
  60000
)
