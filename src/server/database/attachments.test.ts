// @vitest-environment node
import { expect, it } from 'vitest'

import { databaseTest } from './databaseTest'

it(
  'attachments',
  databaseTest(async db => {
    await db.init()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    const p = await db.portfolios.create({ userId: u.id, name: 'Portfolio' })
    const a = await db.accounts.create({
      portfolioId: p.id,
      name: 'Account',
      number: '',
      currency: 'EUR',
      status: 'active',
    })
    const t1 = await db.transactions.create({
      userId: u.id,
      date: '2020-01-01',
      time: '00:00:00',
      data: {
        type: 'cashDeposit',
        cashAccountId: a.id,
        cashAmount: '1',
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
        cashAmount: '1',
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
      { ...a2, transactionCount: 0 },
      { ...a1, transactionCount: 0 },
    ])
    await expect(db.attachments.listByUserId('user_???')).resolves.toEqual([])
    await db.attachments.linkToTransaction(a1.id, t1.id)
    await expect(db.attachments.listByUserId(u.id, { transactionId: t1.id })).resolves.toEqual([
      { ...a1, transactionCount: 1 },
    ])
    await expect(db.attachments.listByUserId(u.id, { transactionId: t2.id })).resolves.toEqual([])
    await db.attachments.linkToTransaction(a1.id, t2.id)
    await expect(db.attachments.listByUserId(u.id, { transactionId: t1.id })).resolves.toEqual([
      { ...a1, transactionCount: 2 },
    ])
    await expect(db.attachments.listByUserId(u.id, { transactionId: t2.id })).resolves.toEqual([
      { ...a1, transactionCount: 2 },
    ])
    await db.attachments.linkToTransaction(a2.id, t1.id)
    await expect(db.attachments.listByUserId(u.id, { transactionId: t1.id })).resolves.toEqual([
      { ...a2, transactionCount: 1 },
      { ...a1, transactionCount: 2 },
    ])
    await expect(db.attachments.listByUserId(u.id, { transactionId: t2.id })).resolves.toEqual([
      { ...a1, transactionCount: 2 },
    ])
    await expect(db.attachments.listByUserId(u.id, { transactionId: 'tx_???' })).resolves.toEqual([])
    await db.attachments.linkToTransaction(a1.id, t1.id)
    await db.attachments.unlinkFromTransaction(a1.id, t1.id)
    await expect(db.attachments.listByUserId(u.id, { transactionId: t1.id })).resolves.toEqual([
      { ...a2, transactionCount: 1 },
    ])
    await db.attachments.unlinkFromTransaction(a2.id, t1.id)
    await expect(db.attachments.listByUserId(u.id, { transactionId: t1.id })).resolves.toEqual([])
    await expect(db.attachments.listByUserId(u.id, { transactionId: 'tx_???' })).resolves.toEqual([])
    await db.attachments.unlinkFromTransaction(a1.id, t1.id)
    await db.attachments.linkToTransaction(a1.id, t1.id)
    await db.attachments.unlinkFromTransaction(a1.id, t1.id)
  }),
  {
    timeout: 60000,
  }
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
      db.attachments.readDerivation(a1.id, 'double', 60 * 1000, async b => doubleBuffer(b))
    ).resolves.toEqual(doubleBuffer(a1b, true))
    expect([doubleCount, tripleCount]).toEqual([1, 0])
    await expect(
      db.attachments.readDerivation(a1.id, 'double', 60 * 1000, async b => doubleBuffer(b))
    ).resolves.toEqual(doubleBuffer(a1b, true))
    expect([doubleCount, tripleCount]).toEqual([1, 0])
    await expect(
      db.attachments.readDerivation(a1.id, 'triple', 60 * 1000, async b => tripleBuffer(b))
    ).resolves.toEqual(tripleBuffer(a1b, true))
    expect([doubleCount, tripleCount]).toEqual([1, 1])
    await expect(
      db.attachments.readDerivation(a1.id, 'triple', 60 * 1000, async b => tripleBuffer(b))
    ).resolves.toEqual(tripleBuffer(a1b, true))
    expect([doubleCount, tripleCount]).toEqual([1, 1])
    await expect(
      db.attachments.readDerivation(a2.id, 'double', 60 * 1000, async b => doubleBuffer(b))
    ).resolves.toEqual(doubleBuffer(a2b, true))
    expect([doubleCount, tripleCount]).toEqual([2, 1])
    await expect(
      db.attachments.readDerivation(a2.id, 'double', 60 * 1000, async b => doubleBuffer(b))
    ).resolves.toEqual(doubleBuffer(a2b, true))
    expect([doubleCount, tripleCount]).toEqual([2, 1])
  }),
  {
    timeout: 60000,
  }
)
