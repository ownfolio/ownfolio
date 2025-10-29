import { expect, it } from 'vitest'

import { currencies } from '../../shared/models/Currency'
import { databaseTest } from './databaseTest'

it(
  'quotes',
  databaseTest(async db => {
    await db.init()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    const s1 = await db.assets.create({
      userId: u.id,
      name: 'Asset 1',
      number: '',
      symbol: 'S1',
      denomination: 2,
      currency: currencies.EUR.symbol,
      quoteProvider: null,
      status: 'active',
    })
    const s2 = await db.assets.create({
      userId: u.id,
      name: 'Asset 2',
      number: '',
      symbol: 'S2',
      denomination: 2,
      currency: 'EUR',
      quoteProvider: null,
      status: 'active',
    })
    await db.quotes.createOrUpdate({
      assetId: s1.id,
      date: '2020-01-01',
      open: '20',
      high: '40',
      low: '10',
      close: '30',
    })
    await db.quotes.createOrUpdate({
      assetId: s2.id,
      date: '2020-01-01',
      open: '20',
      high: '40',
      low: '10',
      close: '30',
    })
    await db.quotes.createOrUpdate({
      assetId: s1.id,
      date: '2020-02-01',
      open: '30',
      high: '50',
      low: '20',
      close: '40',
    })
    await db.quotes.createOrUpdate({
      assetId: s1.id,
      date: '2020-03-01',
      open: '40',
      high: '60',
      low: '30',
      close: '50',
    })
    await expect(db.quotes.listByAssetId(s1.id)).resolves.toEqual([
      {
        assetId: s1.id,
        date: '2020-01-01',
        open: '20',
        high: '40',
        low: '10',
        close: '30',
      },
      {
        assetId: s1.id,
        date: '2020-02-01',
        open: '30',
        high: '50',
        low: '20',
        close: '40',
      },
      {
        assetId: s1.id,
        date: '2020-03-01',
        open: '40',
        high: '60',
        low: '30',
        close: '50',
      },
    ])
    await db.quotes.createOrUpdate(
      {
        assetId: s1.id,
        date: '2020-03-01',
        open: '41',
        high: '61',
        low: '31',
        close: '51',
      },
      {
        assetId: s2.id,
        date: '2020-01-01',
        open: '21',
        high: '41',
        low: '11',
        close: '31',
      }
    )
    await expect(db.quotes.listLatestClosesByUserId(u.id)).resolves.toEqual([
      {
        assetId: s1.id,
        date: '2020-03-01',
        open: '41',
        high: '61',
        low: '31',
        close: '51',
      },
      {
        assetId: s2.id,
        date: '2020-01-01',
        open: '21',
        high: '41',
        low: '11',
        close: '31',
      },
    ])
    await expect(db.quotes.countForAssetId(s1.id)).resolves.toBe(3)
    await expect(db.quotes.countForAssetId(s2.id)).resolves.toBe(1)
    await expect(db.quotes.countForAssetId('ast_???')).resolves.toBe(0)
  }),
  60000
)
