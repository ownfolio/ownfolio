// @vitest-environment node
import BigNumber from 'bignumber.js'
import { expect, it } from 'vitest'

import { databaseTest } from './databaseTest'

it(
  'classifications',
  databaseTest(async db => {
    await db.init()
    const u1 = await db.users.create({ email: 'user1@domain.com' }, 'password')
    const u2 = await db.users.create({ email: 'user2@domain.com' }, 'password')
    const p1 = await db.portfolios.create({ userId: u1.id, name: 'Portfolio 1', status: 'active' })
    const p2 = await db.portfolios.create({ userId: u2.id, name: 'Portfolio 2', status: 'active' })
    const a1 = await db.accounts.create({
      portfolioId: p1.id,
      name: 'Account 1',
      status: 'active',
      currency: 'EUR',
      number: '',
    })
    const a2 = await db.accounts.create({
      portfolioId: p2.id,
      name: 'Account 2',
      status: 'active',
      currency: 'EUR',
      number: '',
    })
    await expect(db.classifications.listByUserId(u1.id)).resolves.toEqual([])
    await expect(db.classifications.listByUserId(u2.id)).resolves.toEqual([])
    const c11 = await db.classifications.create({
      userId: u1.id,
      parentClassificationId: null,
      name: 'classification11',
      status: 'active',
    })
    const c12 = await db.classifications.create({
      userId: u1.id,
      parentClassificationId: null,
      name: 'classification12',
      status: 'active',
    })
    const c13 = await db.classifications.create({
      userId: u1.id,
      parentClassificationId: c12.id,
      name: 'classification13',
      status: 'active',
    })
    const c21 = await db.classifications.create({
      userId: u2.id,
      parentClassificationId: null,
      name: 'classification21',
      status: 'active',
    })
    await expect(db.classifications.listByUserId(u1.id)).resolves.toEqual([c11, c12, c13])
    await expect(db.classifications.listByUserId(u2.id)).resolves.toEqual([c21])
    await expect(db.classifications.listAssignmentsByUserId(u1.id)).resolves.toEqual([])
    await expect(db.classifications.listAssignmentsByUserId(u2.id)).resolves.toEqual([])
    await expect(db.classifications.assignToClassification(c11.id, null, null, BigNumber(100))).rejects.toThrowError()
    await db.classifications.assignToClassification(c11.id, a1.id, null, BigNumber(100))
    await expect(db.classifications.listAssignmentsByUserId(u1.id)).resolves.toEqual([
      { classificationId: c11.id, accountId: a1.id, assetId: null, weight: BigNumber('100') },
    ])
    await expect(db.classifications.listAssignmentsByUserId(u2.id)).resolves.toEqual([])
    await db.classifications.assignToClassification(c21.id, a2.id, null, BigNumber(100))
    await expect(db.classifications.listAssignmentsByUserId(u1.id)).resolves.toEqual([
      { classificationId: c11.id, accountId: a1.id, assetId: null, weight: BigNumber('100') },
    ])
    await expect(db.classifications.listAssignmentsByUserId(u2.id)).resolves.toEqual([
      { classificationId: c21.id, accountId: a2.id, assetId: null, weight: BigNumber('100') },
    ])
  }),
  60000
)
