import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import {
  classificationBucketAssignmentSchema,
  classificationBucketSchema,
  classificationSchema,
} from '../models/Classification'
import { byIdSchema, listResponseSchema, responseSchema } from '../utils/schemas'

export const rpcV1ClassificationDefinition = {
  listClassifications: createRpcCallDefinition(z.void(), listResponseSchema(classificationSchema)),
  createClassification: createRpcCallDefinition(
    classificationSchema.pick({ name: true }),
    responseSchema(classificationSchema)
  ),
  updateClassification: createRpcCallDefinition(
    classificationSchema.pick({ id: true, name: true, status: true }),
    responseSchema(classificationSchema)
  ),
  deleteClassification: createRpcCallDefinition(byIdSchema, responseSchema(z.void())),

  listClassificationBuckets: createRpcCallDefinition(
    z.object({ classificationId: z.string() }),
    listResponseSchema(classificationBucketSchema)
  ),
  createClassificationBucket: createRpcCallDefinition(
    classificationBucketSchema.omit({ id: true, createdAt: true }),
    responseSchema(classificationBucketSchema)
  ),
  updateClassificationBucket: createRpcCallDefinition(
    classificationBucketSchema,
    responseSchema(classificationBucketSchema)
  ),
  deleteClassificationBucket: createRpcCallDefinition(byIdSchema, responseSchema(z.void())),

  listClassificationAssignments: createRpcCallDefinition(
    z.object({ classificationId: z.string() }),
    listResponseSchema(classificationBucketAssignmentSchema)
  ),
  listAllClassificationAssignments: createRpcCallDefinition(
    z.void(),
    listResponseSchema(classificationBucketAssignmentSchema)
  ),
  setClassificationBucketAssignment: createRpcCallDefinition(
    z.object({
      classificationId: z.string(),
      entityType: z.enum(['asset', 'account']),
      entityId: z.string(),
      bucketId: z.string().nullable(),
    }),
    responseSchema(z.void())
  ),
}
