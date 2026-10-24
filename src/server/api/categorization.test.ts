// @vitest-environment node
import BigNumber from 'bignumber.js'
import { describe, expect, it } from 'vitest'

import { currencies } from '../../shared/models/Currency'
import { databaseTest } from '../database/databaseTest'
import { createRpcV1Categorization } from './categorization'

describe('categorization', () => {
  it(
    'manages categories and assignments',
    databaseTest(async db => {
      await db.init()
      const u1 = await db.users.create({ email: 'user1@domain.com' }, 'password')
      const u2 = await db.users.create({ email: 'user2@domain.com' }, 'password')
      const api = createRpcV1Categorization(db)
      const ctx = { user: u1, setSessionId: async () => {}, unsetSessionId: async () => {} }
      const ctx2 = { user: u2, setSessionId: async () => {}, unsetSessionId: async () => {} }
      const portfolio = await db.portfolios.create({ userId: u1.id, name: 'Portfolio', status: 'active' })
      const account = await db.accounts.create({
        portfolioId: portfolio.id,
        name: 'Depot',
        number: '',
        currency: currencies.EUR.symbol,
        status: 'active',
      })
      const asset = await db.assets.create({
        userId: u1.id,
        name: 'ETF',
        number: '',
        symbol: 'ETF',
        denomination: 0,
        currency: currencies.EUR.symbol,
        quoteProvider: null,
        status: 'active',
      })

      const { data: region } = await api.createCategorization.handler(ctx, { name: 'Region' })
      const { data: liquidity } = await api.createCategorization.handler(ctx, { name: 'Liquidity' })
      const { data: eu } = await api.createCategory.handler(ctx, {
        categorizationId: region.id,
        parentCategoryId: null,
        name: 'EU',
      })
      const { data: germany } = await api.createCategory.handler(ctx, {
        categorizationId: region.id,
        parentCategoryId: eu.id,
        name: 'Germany',
      })
      const { data: us } = await api.createCategory.handler(ctx, {
        categorizationId: region.id,
        parentCategoryId: null,
        name: 'US',
      })
      const { data: liquid } = await api.createCategory.handler(ctx, {
        categorizationId: liquidity.id,
        parentCategoryId: null,
        name: 'Liquid',
      })

      // parents must be in the same categorization and must not create cycles
      await expect(
        api.createCategory.handler(ctx, { categorizationId: region.id, parentCategoryId: liquid.id, name: 'X' })
      ).rejects.toThrow(`Unknown parent category ${liquid.id}`)
      await expect(api.updateCategory.handler(ctx, { ...eu, parentCategoryId: germany.id })).rejects.toThrow(
        'A category cannot be nested below itself'
      )
      await expect(api.updateCategory.handler(ctx, { ...eu, categorizationId: liquidity.id })).rejects.toThrow(
        'Categories cannot be moved to another categorization'
      )

      // other users cannot see or use the categorization
      await expect(api.listCategorizations.handler(ctx2, {})).resolves.toEqual({ data: [] })
      await expect(api.listCategories.handler(ctx2, {})).resolves.toEqual({ data: [] })
      await expect(api.retrieveCategory.handler(ctx2, { id: eu.id })).rejects.toThrow(`Unknown category ${eu.id}`)
      await expect(
        api.setCategoryAssignments.handler(ctx2, {
          categorizationId: region.id,
          accountId: null,
          assetId: null,
          assignments: [],
        })
      ).rejects.toThrow(`Unknown categorization ${region.id}`)

      // validation of assignments
      await expect(
        api.setCategoryAssignments.handler(ctx, {
          categorizationId: region.id,
          accountId: null,
          assetId: null,
          assignments: [],
        })
      ).rejects.toThrow('Either accountId or assetId must be set')
      await expect(
        api.setCategoryAssignments.handler(ctx, {
          categorizationId: region.id,
          accountId: null,
          assetId: asset.id,
          assignments: [
            { categoryId: us.id, fraction: BigNumber('0.7') },
            { categoryId: eu.id, fraction: BigNumber('0.4') },
          ],
        })
      ).rejects.toThrow('Fractions must sum up to at most 1')
      await expect(
        api.setCategoryAssignments.handler(ctx, {
          categorizationId: region.id,
          accountId: null,
          assetId: asset.id,
          assignments: [{ categoryId: liquid.id, fraction: BigNumber('1') }],
        })
      ).rejects.toThrow(`Unknown category ${liquid.id}`)

      // assignments for cash, asset in general and asset in a specific account
      await api.setCategoryAssignments.handler(ctx, {
        categorizationId: region.id,
        accountId: null,
        assetId: asset.id,
        assignments: [
          { categoryId: us.id, fraction: BigNumber('0.7') },
          { categoryId: eu.id, fraction: BigNumber('0.2') },
        ],
      })
      await api.setCategoryAssignments.handler(ctx, {
        categorizationId: region.id,
        accountId: account.id,
        assetId: asset.id,
        assignments: [{ categoryId: germany.id, fraction: BigNumber('1') }],
      })
      await api.setCategoryAssignments.handler(ctx, {
        categorizationId: liquidity.id,
        accountId: account.id,
        assetId: null,
        assignments: [{ categoryId: liquid.id, fraction: BigNumber('1') }],
      })
      const { data: regionAssignments } = await api.listCategoryAssignments.handler(ctx, {
        categorizationId: region.id,
      })
      const regionAssignmentsPlain = regionAssignments.map(a => [
        a.categoryId,
        a.accountId,
        a.assetId,
        a.fraction.toString(),
      ])
      expect(regionAssignmentsPlain).toHaveLength(3)
      expect(regionAssignmentsPlain).toEqual(
        expect.arrayContaining([
          [us.id, null, asset.id, '0.7'],
          [eu.id, null, asset.id, '0.2'],
          [germany.id, account.id, asset.id, '1'],
        ])
      )
      await expect(api.listCategoryAssignments.handler(ctx, {}).then(r => r.data)).resolves.toHaveLength(4)

      // replacing only touches the given target
      await api.setCategoryAssignments.handler(ctx, {
        categorizationId: region.id,
        accountId: null,
        assetId: asset.id,
        assignments: [{ categoryId: us.id, fraction: BigNumber('1') }],
      })
      await expect(
        api.listCategoryAssignments.handler(ctx, { categorizationId: region.id }).then(r => r.data)
      ).resolves.toHaveLength(2)

      // the database rejects assignments without target
      await expect(
        db.categoryAssignments.replace(region.id, { accountId: null, assetId: null }, [
          { categoryId: us.id, fraction: BigNumber('1') },
        ])
      ).rejects.toThrow('ck__category_assignment__target')

      // deleting a category removes its subcategories and their assignments
      await api.deleteCategory.handler(ctx, { id: eu.id })
      await expect(api.listCategories.handler(ctx, { categorizationId: region.id })).resolves.toMatchObject({
        data: [{ id: us.id }],
      })
      await expect(api.listCategoryAssignments.handler(ctx, { categorizationId: region.id })).resolves.toMatchObject({
        data: [{ categoryId: us.id }],
      })

      // deleting the asset removes its assignments
      await db.assets.delete(asset.id)
      await expect(api.listCategoryAssignments.handler(ctx, { categorizationId: region.id })).resolves.toEqual({
        data: [],
      })

      // deleting a categorization removes everything inside
      await api.deleteCategorization.handler(ctx, { id: liquidity.id })
      await expect(api.listCategories.handler(ctx, {})).resolves.toMatchObject({ data: [{ id: us.id }] })
      await expect(api.listCategoryAssignments.handler(ctx, {})).resolves.toEqual({ data: [] })
    }),
    60000
  )
})
