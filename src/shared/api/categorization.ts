import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { categorizationSchema } from '../models/Categorization'
import { categorySchema } from '../models/Category'
import { categoryAssignmentFractionSchema, categoryAssignmentSchema } from '../models/CategoryAssignment'
import { byIdSchemaFor, listResponseSchema, pagingParamsSchema, responseSchema } from '../utils/schemas'

export const rpcV1CategorizationDefinition = {
  listCategorizations: createRpcCallDefinition(pagingParamsSchema, listResponseSchema(categorizationSchema)),
  retrieveCategorization: createRpcCallDefinition(
    byIdSchemaFor('categorization'),
    responseSchema(categorizationSchema)
  ),
  createCategorization: createRpcCallDefinition(
    categorizationSchema.omit({ id: true, userId: true, createdAt: true }),
    responseSchema(categorizationSchema)
  ),
  updateCategorization: createRpcCallDefinition(categorizationSchema, responseSchema(categorizationSchema)),
  deleteCategorization: createRpcCallDefinition(byIdSchemaFor('categorization'), responseSchema(z.void())),

  listCategories: createRpcCallDefinition(
    pagingParamsSchema.extend({
      categorizationId: z.string().optional().describe('Only list the categories of this categorization'),
    }),
    listResponseSchema(categorySchema)
  ),
  retrieveCategory: createRpcCallDefinition(byIdSchemaFor('category'), responseSchema(categorySchema)),
  createCategory: createRpcCallDefinition(
    categorySchema.omit({ id: true, createdAt: true }),
    responseSchema(categorySchema)
  ),
  updateCategory: createRpcCallDefinition(categorySchema, responseSchema(categorySchema)),
  deleteCategory: createRpcCallDefinition(byIdSchemaFor('category'), responseSchema(z.void())),

  listCategoryAssignments: createRpcCallDefinition(
    z.object({
      categorizationId: z.string().optional().describe('Only list the assignments of this categorization'),
    }),
    listResponseSchema(categoryAssignmentSchema)
  ),
  setCategoryAssignments: createRpcCallDefinition(
    categoryAssignmentSchema.pick({ categorizationId: true }).extend({
      accountId: categoryAssignmentSchema.shape.accountId.default(null),
      assetId: categoryAssignmentSchema.shape.assetId.default(null),
      assignments: z
        .array(
          z.object({
            categoryId: z.string().describe('ID of a category of the categorization'),
            fraction: categoryAssignmentFractionSchema,
          })
        )
        .describe(
          'The new assignments of the target, replacing all previous ones in this categorization. Each category at most once, fractions sum up to at most 1. Pass an empty list to remove all assignments'
        ),
    }),
    listResponseSchema(categoryAssignmentSchema)
  ),
}
