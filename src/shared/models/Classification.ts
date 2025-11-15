import { z } from 'zod'

export const classificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  parentClassificationId: z.string().nullable().default(null),
  name: z.string().trim().min(1).max(128),
  status: z.enum(['active', 'inactive', 'hidden']).default('active'),
  createdAt: z.string().datetime(),
})

export type Classification = z.infer<typeof classificationSchema>

export function createEmptyClassification(): Classification {
  return {
    id: '',
    userId: '',
    parentClassificationId: null,
    name: '',
    status: 'active',
    createdAt: '',
  }
}

export const classificationAssignmentSchema = z.object({
  classificationId: z.string(),
  accountId: z.string().nullable().default(null),
  assetId: z.string().nullable().default(null),
})

export type ClassificationAssignment = z.infer<typeof classificationAssignmentSchema>

export function createEmptyClassificationAssignment(): ClassificationAssignment {
  return {
    classificationId: '',
    accountId: null,
    assetId: null,
  }
}
