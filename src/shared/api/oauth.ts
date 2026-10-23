import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { responseSchema } from '../utils/schemas'

export const oauthAuthorizationRequestSchema = z.object({
  clientId: z.string(),
  redirectUri: z.string(),
  codeChallenge: z.string(),
  state: z.string().optional(),
  scope: z.string().optional(),
  resource: z.string().optional(),
})

export type OAuthAuthorizationRequest = z.infer<typeof oauthAuthorizationRequestSchema>

export const rpcV1OAuthDefinition = {
  retrieveOAuthClient: createRpcCallDefinition(
    oauthAuthorizationRequestSchema,
    responseSchema(z.object({ clientName: z.string().nullable(), clientUri: z.string().nullable() }))
  ),
  decideOAuthAuthorization: createRpcCallDefinition(
    oauthAuthorizationRequestSchema.extend({ approve: z.boolean() }),
    responseSchema(z.object({ redirectUrl: z.string() }))
  ),
}
