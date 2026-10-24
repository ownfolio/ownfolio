import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'
import BigNumber from 'bignumber.js'

import { rpcV1CategorizationDefinition } from '../../shared/api/categorization'
import { Categorization } from '../../shared/models/Categorization'
import { Category } from '../../shared/models/Category'
import { Database } from '../database'
import { RpcCtx } from './context'

export function createRpcV1Categorization(database: Database) {
  const findCategorization = async (userId: string, id: string): Promise<Categorization> => {
    const categorization = await database.categorizations.find(id)
    if (!categorization || categorization.userId !== userId) throw RpcError.badRequest(`Unknown categorization ${id}`)
    return categorization
  }

  const findCategory = async (userId: string, id: string): Promise<Category> => {
    const category = await database.categories.find(id)
    const categorization = await database.categorizations.find(category?.categorizationId || '')
    if (!category || !categorization || categorization.userId !== userId)
      throw RpcError.badRequest(`Unknown category ${id}`)
    return category
  }

  const ensureValidParentCategory = async (
    userId: string,
    category: Omit<Category, 'id' | 'createdAt'>,
    id?: string
  ): Promise<void> => {
    if (!category.parentCategoryId) return
    const categories = await database.categories.listByUserId(userId, category.categorizationId)
    let current = categories.find(c => c.id === category.parentCategoryId)
    if (!current) throw RpcError.badRequest(`Unknown parent category ${category.parentCategoryId}`)
    while (current) {
      if (current.id === id) throw RpcError.badRequest('A category cannot be nested below itself')
      current = categories.find(c => c.id === current!.parentCategoryId)
    }
  }

  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1CategorizationDefinition>(
    rpcV1CategorizationDefinition,
    {
      listCategorizations: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const categorizations = await database.categorizations.listByUserId(ctx.user.id, input.skip, input.top)
        return { data: categorizations }
      },
      retrieveCategorization: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const categorization = await findCategorization(ctx.user.id, input.id)
        return { data: categorization }
      },
      createCategorization: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const categorization = await database.categorizations.create({ ...input, userId: ctx.user.id })
        return { data: categorization }
      },
      updateCategorization: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const categorization = await findCategorization(ctx.user.id, input.id)
        const categorization2 = await database.categorizations.update({ ...input, userId: categorization.userId })
        return { data: categorization2 }
      },
      deleteCategorization: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        await findCategorization(ctx.user.id, input.id)
        await database.categorizations.delete(input.id)
        return { data: undefined }
      },

      listCategories: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const categories = await database.categories.listByUserId(
          ctx.user.id,
          input.categorizationId,
          input.skip,
          input.top
        )
        return { data: categories }
      },
      retrieveCategory: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const category = await findCategory(ctx.user.id, input.id)
        return { data: category }
      },
      createCategory: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        await findCategorization(ctx.user.id, input.categorizationId)
        await ensureValidParentCategory(ctx.user.id, input)
        const category = await database.categories.create(input)
        return { data: category }
      },
      updateCategory: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const category = await findCategory(ctx.user.id, input.id)
        if (input.categorizationId !== category.categorizationId)
          throw RpcError.badRequest('Categories cannot be moved to another categorization')
        await ensureValidParentCategory(ctx.user.id, input, input.id)
        const category2 = await database.categories.update(input)
        return { data: category2 }
      },
      deleteCategory: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        await findCategory(ctx.user.id, input.id)
        await database.categories.delete(input.id)
        return { data: undefined }
      },

      listCategoryAssignments: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        const assignments = await database.categoryAssignments.listByUserId(ctx.user.id, input.categorizationId)
        return { data: assignments }
      },
      setCategoryAssignments: async (ctx, input) => {
        if (!ctx.user) throw RpcError.unauthorized()
        await findCategorization(ctx.user.id, input.categorizationId)
        if (!input.accountId && !input.assetId) throw RpcError.badRequest('Either accountId or assetId must be set')
        if (input.accountId) {
          const account = await database.accounts.find(input.accountId)
          const portfolio = await database.portfolios.find(account?.portfolioId || '')
          if (!account || !portfolio || portfolio.userId !== ctx.user.id)
            throw RpcError.badRequest(`Unknown account ${input.accountId}`)
        }
        if (input.assetId) {
          const asset = await database.assets.find(input.assetId)
          if (!asset || asset.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown asset ${input.assetId}`)
        }
        const categories = await database.categories.listByUserId(ctx.user.id, input.categorizationId)
        for (const assignment of input.assignments) {
          if (!categories.find(c => c.id === assignment.categoryId))
            throw RpcError.badRequest(`Unknown category ${assignment.categoryId}`)
        }
        if (new Set(input.assignments.map(a => a.categoryId)).size !== input.assignments.length)
          throw RpcError.badRequest('Each category can only be assigned once')
        const total = input.assignments.reduce((sum, a) => sum.plus(a.fraction), BigNumber(0))
        if (total.isGreaterThan(1)) throw RpcError.badRequest('Fractions must sum up to at most 1')
        const assignments = await database.categoryAssignments.replace(
          input.categorizationId,
          { accountId: input.accountId || null, assetId: input.assetId || null },
          input.assignments
        )
        return { data: assignments }
      },
    }
  )
}
