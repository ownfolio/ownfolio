import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { classificationAssignmentSchema, classificationSchema } from '../models/Classification'
import { byIdSchema, listResponseSchema, pagingParamsSchema, responseSchema } from '../utils/schemas'

export const rpcV1ClassificationDefinition = {
  listClassifications: createRpcCallDefinition(pagingParamsSchema, listResponseSchema(classificationSchema)),
  listClassificationAssignments: createRpcCallDefinition(
    pagingParamsSchema,
    listResponseSchema(classificationAssignmentSchema)
  ),
  retrieveClassification: createRpcCallDefinition(byIdSchema, responseSchema(classificationSchema)),
  createClassification: createRpcCallDefinition(
    classificationSchema.omit({ id: true, userId: true, createdAt: true }),
    responseSchema(classificationSchema)
  ),
  updateClassification: createRpcCallDefinition(classificationSchema, responseSchema(classificationSchema)),
  updateClassificationStatus: createRpcCallDefinition(
    classificationSchema.pick({ id: true, status: true }),
    responseSchema(classificationSchema)
  ),
  deleteClassification: createRpcCallDefinition(byIdSchema, responseSchema(z.void())),
}
