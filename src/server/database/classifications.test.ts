// @vitest-environment node
import { expect, it } from 'vitest'

import { currencies } from '../../shared/models/Currency'
import { databaseTest } from './databaseTest'

it(
  'classifications',
  databaseTest(async db => {
    await db.init()
    const u = await db.users.create({ email: 'user@domain.com' }, 'password')
    const u2 = await db.users.create({ email: 'other@domain.com' }, 'password')

    // Create classifications
    const c1 = await db.classifications.create({ userId: u.id, name: 'Risk Profile', status: 'active' })
    const c2 = await db.classifications.create({ userId: u.id, name: 'Geography', status: 'active' })
    await db.classifications.create({ userId: u2.id, name: 'Other User', status: 'active' })

    await expect(db.classifications.listByUserId(u.id)).resolves.toHaveLength(2)
    await expect(db.classifications.listByUserId(u2.id)).resolves.toHaveLength(1)
    await expect(db.classifications.listByUserId('user_???')).resolves.toHaveLength(0)

    // Create buckets (nested)
    const bHigh = await db.classifications.createBucket({
      classificationId: c1.id,
      parentBucketId: null,
      name: 'High Risk',
      sortOrder: 0,
    })
    const bMedium = await db.classifications.createBucket({
      classificationId: c1.id,
      parentBucketId: null,
      name: 'Medium Risk',
      sortOrder: 1,
    })
    const bHighStocks = await db.classifications.createBucket({
      classificationId: c1.id,
      parentBucketId: bHigh.id,
      name: 'Stocks',
      sortOrder: 0,
    })
    await db.classifications.createBucket({
      classificationId: c2.id,
      parentBucketId: null,
      name: 'Europe',
      sortOrder: 0,
    })

    const c1Buckets = await db.classifications.listBucketsByClassificationId(c1.id)
    expect(c1Buckets).toHaveLength(3)
    const c2Buckets = await db.classifications.listBucketsByClassificationId(c2.id)
    expect(c2Buckets).toHaveLength(1)

    // findBucket
    await expect(db.classifications.findBucket(bHigh.id)).resolves.toMatchObject({ name: 'High Risk' })
    await expect(db.classifications.findBucket('clb_???')).resolves.toBeUndefined()

    // Update bucket
    await db.classifications.updateBucket({ ...bMedium, name: 'Low Risk' })
    await expect(db.classifications.findBucket(bMedium.id)).resolves.toMatchObject({ name: 'Low Risk' })

    // Assignments — create asset and account to assign
    const p = await db.portfolios.create({ userId: u.id, name: 'Portfolio', status: 'active' })
    const account = await db.accounts.create({
      portfolioId: p.id,
      name: 'Brokerage',
      number: '',
      currency: currencies.EUR.symbol,
      status: 'active',
    })
    const asset = await db.assets.create({
      userId: u.id,
      name: 'Apple',
      number: '',
      symbol: 'AAPL',
      denomination: 2,
      currency: currencies.EUR.symbol,
      quoteProvider: null,
      status: 'active',
    })

    // Assign asset and account to buckets
    await db.classifications.setAssignment(c1.id, 'asset', asset.id, bHighStocks.id)
    await db.classifications.setAssignment(c1.id, 'account', account.id, bHigh.id)

    const c1Assignments = await db.classifications.listAssignmentsByClassificationId(c1.id)
    expect(c1Assignments).toHaveLength(2)
    expect(c1Assignments.find(a => a.entityType === 'asset')?.bucketId).toBe(bHighStocks.id)
    expect(c1Assignments.find(a => a.entityType === 'account')?.bucketId).toBe(bHigh.id)

    // Reassign asset to a different bucket (upsert)
    await db.classifications.setAssignment(c1.id, 'asset', asset.id, bHigh.id)
    const updated = await db.classifications.listAssignmentsByClassificationId(c1.id)
    expect(updated.find(a => a.entityType === 'asset')?.bucketId).toBe(bHigh.id)
    expect(updated).toHaveLength(2)

    // Unassign
    await db.classifications.setAssignment(c1.id, 'asset', asset.id, null)
    await expect(db.classifications.listAssignmentsByClassificationId(c1.id)).resolves.toHaveLength(1)

    // listAllAssignmentsByUserId
    await db.classifications.setAssignment(c1.id, 'asset', asset.id, bHighStocks.id)
    const allAssignments = await db.classifications.listAllAssignmentsByUserId(u.id)
    expect(allAssignments).toHaveLength(2)
    await expect(db.classifications.listAllAssignmentsByUserId(u2.id)).resolves.toHaveLength(0)

    // Delete bucket cascades assignments
    await db.classifications.deleteBucket(bHighStocks.id)
    await expect(db.classifications.listAssignmentsByClassificationId(c1.id)).resolves.toHaveLength(1)
    await expect(db.classifications.listBucketsByClassificationId(c1.id)).resolves.toHaveLength(2)

    // Delete classification cascades buckets
    await db.classifications.delete(c1.id)
    await expect(db.classifications.listByUserId(u.id)).resolves.toHaveLength(1)
    await expect(db.classifications.listBucketsByClassificationId(c1.id)).resolves.toHaveLength(0)
  }),
  60000
)
