import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { assetSchema } from '../models/Asset'
import { byIdSchema, listResponseSchema, pagingParamsSchema, responseSchema } from '../utils/schemas'

export const rpcV1AssetDefinition = {
  listAssets: createRpcCallDefinition(pagingParamsSchema, listResponseSchema(assetSchema)),
  retrieveAsset: createRpcCallDefinition(byIdSchema, responseSchema(assetSchema)),
  createAsset: createRpcCallDefinition(
    assetSchema.omit({ id: true, userId: true, createdAt: true }),
    responseSchema(assetSchema)
  ),
  updateAsset: createRpcCallDefinition(assetSchema, responseSchema(assetSchema)),
  updateAssetStatus: createRpcCallDefinition(assetSchema.pick({ id: true, status: true }), responseSchema(assetSchema)),
  deleteAsset: createRpcCallDefinition(byIdSchema, responseSchema(z.void())),
}
