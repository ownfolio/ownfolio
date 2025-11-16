// @vitest-environment node
import BigNumber from 'bignumber.js'
import { expect, it } from 'vitest'

import { currencies } from '../../shared/models/Currency'
import { databaseTest } from './databaseTest'

it(
  'attachments',
  databaseTest(async db => {
    await db.init()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    const p = await db.portfolios.create({ userId: u.id, name: 'Portfolio', status: 'active' })
    const a = await db.accounts.create({
      portfolioId: p.id,
      name: 'Account',
      number: '',
      currency: currencies.EUR.symbol,
      status: 'active',
    })
    const t1 = await db.transactions.create({
      userId: u.id,
      date: '2020-01-01',
      time: '00:00:00',
      data: {
        type: 'cashDeposit',
        cashAccountId: a.id,
        cashAmount: BigNumber('1'),
      },
      reference: '',
      comment: '',
    })
    const t2 = await db.transactions.create({
      userId: u.id,
      date: '2020-01-01',
      time: '00:00:00',
      data: {
        type: 'cashDeposit',
        cashAccountId: a.id,
        cashAmount: BigNumber('1'),
      },
      reference: '',
      comment: '',
    })
    const a1b = Buffer.from('Hello\nWorld\n1\n\x00')
    const a1 = await db.attachments.createAndWrite(u.id, 'test.txt', 'text/plain', a1b)
    const a2b = Buffer.from('Hello\nWorld\n2\n\x00')
    const a2 = await db.attachments.createAndWrite(u.id, 'test2.txt', 'text/plain', a2b)
    await expect(db.attachments.read(a1.id)).resolves.toEqual(a1b)
    await expect(db.attachments.read(a2.id)).resolves.toEqual(a2b)
    await expect(db.attachments.read('attm_???')).rejects.toThrowError()
    await expect(db.attachments.listByUserId(u.id)).resolves.toEqual([
      { ...a2, transactionIds: [] },
      { ...a1, transactionIds: [] },
    ])
    await expect(db.attachments.listByUserId('user_???')).resolves.toEqual([])
    await db.attachments.linkToTransaction(a1.id, t1.id)
    await expect(db.attachments.listByUserId(u.id, { transactionId: t1.id })).resolves.toEqual([
      { ...a1, transactionIds: [t1.id] },
    ])
    await expect(db.attachments.listByUserId(u.id, { transactionId: t2.id })).resolves.toEqual([])
    await db.attachments.linkToTransaction(a1.id, t2.id)
    await expect(db.attachments.listByUserId(u.id, { transactionId: t1.id })).resolves.toEqual([
      { ...a1, transactionIds: [t1.id, t2.id] },
    ])
    await expect(db.attachments.listByUserId(u.id, { transactionId: t2.id })).resolves.toEqual([
      { ...a1, transactionIds: [t1.id, t2.id] },
    ])
    await db.attachments.linkToTransaction(a2.id, t1.id)
    await expect(db.attachments.listByUserId(u.id, { transactionId: t1.id })).resolves.toEqual([
      { ...a2, transactionIds: [t1.id] },
      { ...a1, transactionIds: [t1.id, t2.id] },
    ])
    await expect(db.attachments.listByUserId(u.id, { transactionId: t2.id })).resolves.toEqual([
      { ...a1, transactionIds: [t1.id, t2.id] },
    ])
    await expect(db.attachments.listByUserId(u.id, { transactionId: 'tx_???' })).resolves.toEqual([])
    await db.attachments.linkToTransaction(a1.id, t1.id)
    await db.attachments.unlinkFromTransaction(a1.id, t1.id)
    await expect(db.attachments.listByUserId(u.id, { transactionId: t1.id })).resolves.toEqual([
      { ...a2, transactionIds: [t1.id] },
    ])
    await db.attachments.unlinkFromTransaction(a2.id, t1.id)
    await expect(db.attachments.listByUserId(u.id, { transactionId: t1.id })).resolves.toEqual([])
    await expect(db.attachments.listByUserId(u.id, { transactionId: 'tx_???' })).resolves.toEqual([])
    await db.attachments.unlinkFromTransaction(a1.id, t1.id)
    await db.attachments.linkToTransaction(a1.id, t1.id)
    await db.attachments.unlinkFromTransaction(a1.id, t1.id)
  }),
  60000
)

it(
  'attachmentsDerivationCache',
  databaseTest(async db => {
    await db.init()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    const a1b = Buffer.from('Hello\nWorld\n1\n\x00')
    const a1 = await db.attachments.createAndWrite(u.id, 'test.txt', 'text/plain', a1b)
    const a2b = Buffer.from('Hello\nWorld\n2\n\x00')
    const a2 = await db.attachments.createAndWrite(u.id, 'test2.txt', 'text/plain', a2b)
    await expect(db.attachments.read(a1.id)).resolves.toEqual(a1b)
    await expect(db.attachments.read(a2.id)).resolves.toEqual(a2b)
    await expect(db.attachments.read('attm_???')).rejects.toThrowError()
    let doubleCount = 0
    let tripleCount = 0
    const doubleBuffer = (buf: Buffer, noCount: boolean = false) => {
      if (!noCount) {
        doubleCount++
      }
      return Buffer.concat([buf, buf])
    }
    const tripleBuffer = (buf: Buffer, noCount: boolean = false) => {
      if (!noCount) {
        tripleCount++
      }
      return Buffer.concat([buf, buf])
    }
    expect([doubleCount, tripleCount]).toEqual([0, 0])
    await expect(
      db.attachments.readDerivation(a1.id, 'double', 'text/plain', async b => doubleBuffer(b), 60 * 1000)
    ).resolves.toEqual(doubleBuffer(a1b, true))
    expect([doubleCount, tripleCount]).toEqual([1, 0])
    await expect(
      db.attachments.readDerivation(a1.id, 'double', 'text/plain', async b => doubleBuffer(b), 60 * 1000)
    ).resolves.toEqual(doubleBuffer(a1b, true))
    expect([doubleCount, tripleCount]).toEqual([1, 0])
    await expect(
      db.attachments.readDerivation(a1.id, 'triple', 'text/plain', async b => tripleBuffer(b), 60 * 1000)
    ).resolves.toEqual(tripleBuffer(a1b, true))
    expect([doubleCount, tripleCount]).toEqual([1, 1])
    await expect(
      db.attachments.readDerivation(a1.id, 'triple', 'text/plain', async b => tripleBuffer(b), 60 * 1000)
    ).resolves.toEqual(tripleBuffer(a1b, true))
    expect([doubleCount, tripleCount]).toEqual([1, 1])
    await expect(
      db.attachments.readDerivation(a2.id, 'double', 'text/plain', async b => doubleBuffer(b), 60 * 1000)
    ).resolves.toEqual(doubleBuffer(a2b, true))
    expect([doubleCount, tripleCount]).toEqual([2, 1])
    await expect(
      db.attachments.readDerivation(a2.id, 'double', 'text/plain', async b => doubleBuffer(b), 60 * 1000)
    ).resolves.toEqual(doubleBuffer(a2b, true))
    expect([doubleCount, tripleCount]).toEqual([2, 1])
    await expect(db.attachments.listDerivations([a1.id, a2.id], 'unknown')).resolves.toEqual([])
    await expect(db.attachments.listDerivations([], 'double')).resolves.toEqual([])
    await expect(db.attachments.listDerivations([a1.id], 'double')).resolves.toEqual([[a1.id, doubleBuffer(a1b, true)]])
    await expect(db.attachments.listDerivations([a1.id, a2.id], 'double')).resolves.toEqual([
      [a1.id, doubleBuffer(a1b, true)],
      [a2.id, doubleBuffer(a2b, true)],
    ])
    await expect(db.attachments.listDerivations([a1.id, a2.id], 'triple')).resolves.toEqual([
      [a1.id, tripleBuffer(a1b, true)],
    ])
  }),
  60000
)
