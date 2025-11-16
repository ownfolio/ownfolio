import BigNumber from 'bignumber.js'
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
      open: BigNumber('20'),
      high: BigNumber('40'),
      low: BigNumber('10'),
      close: BigNumber('30'),
    })
    await db.quotes.createOrUpdate({
      assetId: s2.id,
      date: '2020-01-01',
      open: BigNumber('20'),
      high: BigNumber('40'),
      low: BigNumber('10'),
      close: BigNumber('30'),
    })
    await db.quotes.createOrUpdate({
      assetId: s1.id,
      date: '2020-02-01',
      open: BigNumber('30'),
      high: BigNumber('50'),
      low: BigNumber('20'),
      close: BigNumber('40'),
    })
    await db.quotes.createOrUpdate({
      assetId: s1.id,
      date: '2020-03-01',
      open: BigNumber('40'),
      high: BigNumber('60'),
      low: BigNumber('30'),
      close: BigNumber('50'),
    })
    await expect(db.quotes.listByAssetId(s1.id)).resolves.toEqual([
      {
        assetId: s1.id,
        date: '2020-01-01',
        open: BigNumber('20'),
        high: BigNumber('40'),
        low: BigNumber('10'),
        close: BigNumber('30'),
      },
      {
        assetId: s1.id,
        date: '2020-02-01',
        open: BigNumber('30'),
        high: BigNumber('50'),
        low: BigNumber('20'),
        close: BigNumber('40'),
      },
      {
        assetId: s1.id,
        date: '2020-03-01',
        open: BigNumber('40'),
        high: BigNumber('60'),
        low: BigNumber('30'),
        close: BigNumber('50'),
      },
    ])
    await db.quotes.createOrUpdate(
      {
        assetId: s1.id,
        date: '2020-03-01',
        open: BigNumber('41'),
        high: BigNumber('61'),
        low: BigNumber('31'),
        close: BigNumber('51'),
      },
      {
        assetId: s2.id,
        date: '2020-01-01',
        open: BigNumber('21'),
        high: BigNumber('41'),
        low: BigNumber('11'),
        close: BigNumber('31'),
      }
    )
    await expect(db.quotes.listLatestClosesByUserId(u.id)).resolves.toEqual([
      {
        assetId: s1.id,
        date: '2020-03-01',
        open: BigNumber('41'),
        high: BigNumber('61'),
        low: BigNumber('31'),
        close: BigNumber('51'),
      },
      {
        assetId: s2.id,
        date: '2020-01-01',
        open: BigNumber('21'),
        high: BigNumber('41'),
        low: BigNumber('11'),
        close: BigNumber('31'),
      },
    ])
    await expect(db.quotes.countForAssetId(s1.id)).resolves.toBe(3)
    await expect(db.quotes.countForAssetId(s2.id)).resolves.toBe(1)
    await expect(db.quotes.countForAssetId('ast_???')).resolves.toBe(0)
  }),
  60000
)
