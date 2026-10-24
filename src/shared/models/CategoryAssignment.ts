import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { bigNumberSchema } from '../utils/schemas'

export const categoryAssignmentFractionSchema = bigNumberSchema
  .refine(fraction => fraction.isGreaterThan(0) && fraction.isLessThanOrEqualTo(1), 'Fraction must be in (0, 1]')
  .describe('Fraction assigned to the category, greater than 0 and at most 1, e.g. "0.7" for 70%')

export const categoryAssignmentSchema = z
  .object({
    id: z.string().describe('ID of the category assignment'),
    categorizationId: z.string().describe('ID of the categorization the category belongs to'),
    categoryId: z.string().describe('ID of the assigned category'),
    accountId: z
      .string()
      .nullable()
      .describe(
        'ID of the account. Without assetId the assignment applies to the cash on the account, with assetId to the units of the asset held in this account'
      ),
    assetId: z
      .string()
      .nullable()
      .describe('ID of the asset. Without accountId the assignment applies to the asset in all accounts'),
    fraction: categoryAssignmentFractionSchema,
    createdAt: z.string().datetime().describe('Creation timestamp (ISO 8601), set by the server'),
  })
  .describe(
    'Assigns a fraction of the cash on an account, of an asset or of an asset in a specific account to a category. At least one of accountId and assetId is set'
  )

export type CategoryAssignment = z.infer<typeof categoryAssignmentSchema>

export interface CategoryAssignmentTarget {
  accountId: string | null
  assetId: string | null
}

export function categoryAssignmentTargetKey(target: CategoryAssignmentTarget): string {
  return `${target.accountId || ''}:${target.assetId || ''}`
}

export interface ResolvedCategoryFractions {
  fractions: { categoryId: string; fraction: BigNumber }[]
  unassignedFraction: BigNumber
}

/**
 * Resolves how the cash on an account (assetId null) or the units of an asset held in an account are split into the
 * categories of a categorization. Assignments for the asset in this account take precedence over the assignments for
 * the asset in general. Whatever is not assigned is returned as unassigned fraction.
 */
export function resolveCategoryFractions(
  assignments: CategoryAssignment[],
  categorizationId: string,
  accountId: string,
  assetId: string | null
): ResolvedCategoryFractions {
  const relevant = assignments.filter(a => a.categorizationId === categorizationId)
  const specific = relevant.filter(a => a.accountId === accountId && a.assetId === assetId)
  const general = assetId !== null ? relevant.filter(a => a.accountId === null && a.assetId === assetId) : []
  const effective = specific.length > 0 ? specific : general
  const fractions = effective.map(a => ({ categoryId: a.categoryId, fraction: a.fraction }))
  const assignedFraction = fractions.reduce((sum, f) => sum.plus(f.fraction), BigNumber(0))
  return {
    fractions,
    unassignedFraction: BigNumber.max(BigNumber(1).minus(assignedFraction), 0),
  }
}
