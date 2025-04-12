import { expect, it } from 'vitest'

import { databaseTest } from './databaseTest'

it(
  'transactions',
  databaseTest(async db => {
    await db.init()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    const p1 = await db.portfolios.create({ userId: u.id, name: 'Portfolio 1' })
    const p2 = await db.portfolios.create({ userId: u.id, name: 'Portfolio 2' })
    const a1 = await db.accounts.create({
      currency: 'EUR',
      portfolioId: p1.id,
      name: 'Account 1',
      number: '',
      status: 'active',
    })
    const a2 = await db.accounts.create({
      currency: 'EUR',
      portfolioId: p1.id,
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
    const t1 = await db.transactions.create({
      userId: u.id,
      date: '2020-01-01',
      time: '00:00:00',
      data: {
        type: 'cashDeposit',
        cashAccountId: a1.id,
        cashAmount: '1234567.89012345',
      },
      reference: 'ref1',
      comment: 'comment1',
    })
    const t2 = await db.transactions.create({
      userId: u.id,
      date: '2020-01-02',
      time: '00:00:00',
      data: {
        type: 'assetBuy',
        assetAccountId: a2.id,
        assetId: s1.id,
        assetAmount: '89012345.1234567',
        cashAccountId: a1.id,
        cashAmount: '1234567.89012345',
        feeCashAmount: '0',
      },
      reference: 'ref2',
      comment: 'comment',
    })
    const attm = await db.attachments.create({ userId: u.id, fileName: 'test.txt', mimeType: 'text/plain', size: 1 })
    await db.attachments.linkToTransaction(attm.id, t1.id)
    await expect(db.transactions.list(0, 100)).resolves.toEqual([t1, t2])
    await expect(db.transactions.list(0, 1)).resolves.toEqual([t1])
    await expect(db.transactions.list(1, 100)).resolves.toEqual([t2])
    await expect(db.transactions.list(0, 0)).resolves.toEqual([])
    await expect(db.transactions.listByUserId(u.id)).resolves.toEqual([
      { ...t2, attachmentIds: [] },
      { ...t1, attachmentIds: [attm.id] },
    ])
    await expect(db.transactions.listByUserId('user_???')).resolves.toEqual([])
    await expect(db.transactions.listByUserId(u.id, { type: 'cashDeposit' })).resolves.toEqual([
      { ...t1, attachmentIds: [attm.id] },
    ])
    await expect(db.transactions.listByUserId(u.id, { type: 'assetBuy' })).resolves.toEqual([
      { ...t2, attachmentIds: [] },
    ])
    await expect(db.transactions.listByUserId(u.id, { fromDate: '2020-01-02' })).resolves.toEqual([
      { ...t2, attachmentIds: [] },
    ])
    await expect(db.transactions.listByUserId(u.id, { toDate: '2020-01-01' })).resolves.toEqual([
      { ...t1, attachmentIds: [attm.id] },
    ])
    await expect(db.transactions.listByUserId(u.id, { portfolioId: p1.id })).resolves.toEqual([
      { ...t2, attachmentIds: [] },
      { ...t1, attachmentIds: [attm.id] },
    ])
    await expect(db.transactions.listByUserId(u.id, { portfolioId: p2.id })).resolves.toEqual([])
    await expect(db.transactions.listByUserId(u.id, { portfolioId: 'port_???' })).resolves.toEqual([])
    await expect(db.transactions.listByUserId(u.id, { accountId: a1.id })).resolves.toEqual([
      { ...t2, attachmentIds: [] },
      { ...t1, attachmentIds: [attm.id] },
    ])
    await expect(db.transactions.listByUserId(u.id, { accountId: a2.id })).resolves.toEqual([
      { ...t2, attachmentIds: [] },
    ])
    await expect(db.transactions.listByUserId(u.id, { accountId: 'act_???' })).resolves.toEqual([])
    await expect(db.transactions.listByUserId(u.id, { assetId: s1.id })).resolves.toEqual([
      { ...t2, attachmentIds: [] },
    ])
    await expect(db.transactions.listByUserId(u.id, { assetId: 'ast_???' })).resolves.toEqual([])
    await expect(db.transactions.listByUserId(u.id, { attachmentId: 'attm_???' })).resolves.toEqual([])
    await expect(db.transactions.listByUserId(u.id, { attachmentId: attm.id })).resolves.toEqual([
      { ...t1, attachmentIds: [attm.id] },
    ])
    await expect(db.transactions.listByUserId(u.id, { reference: 'ref1' })).resolves.toEqual([
      { ...t1, attachmentIds: [attm.id] },
    ])
    await expect(db.transactions.listByUserId(u.id, { reference: 'ref2' })).resolves.toEqual([
      { ...t2, attachmentIds: [] },
    ])
    await expect(db.transactions.countForPortfolioId(p1.id)).resolves.toBe(2)
    await expect(db.transactions.countForPortfolioId(p2.id)).resolves.toBe(0)
    await expect(db.transactions.countForPortfolioId('port_???')).resolves.toBe(0)
    await expect(db.transactions.countForAccountId(a1.id)).resolves.toBe(2)
    await expect(db.transactions.countForAccountId(a2.id)).resolves.toBe(1)
    await expect(db.transactions.countForAccountId('acc_???')).resolves.toBe(0)
    await expect(db.transactions.countForAssetId(s1.id)).resolves.toBe(1)
    await expect(db.transactions.countForAssetId('ast_???')).resolves.toBe(0)
  }),
  60000
)
