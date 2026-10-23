import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { OAuthAuthorizationRequest, rpcV1OAuthDefinition } from '../../shared/api/oauth'
import { Database } from '../database'
import { RpcCtx } from './context'

export function createRpcV1OAuth(database: Database) {
  const findClient = async (input: OAuthAuthorizationRequest) => {
    const client = await database.oauth.findClient(input.clientId)
    if (!client) throw RpcError.badRequest(`Unknown OAuth client ${input.clientId}`)
    if (!client.redirect_uris.includes(input.redirectUri)) {
      throw RpcError.badRequest('Redirect URI is not registered for this OAuth client')
    }
    return client
  }

  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1OAuthDefinition>(rpcV1OAuthDefinition, {
    retrieveOAuthClient: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const client = await findClient(input)
      return { data: { clientName: client.client_name ?? null, clientUri: client.client_uri ?? null } }
    },
    decideOAuthAuthorization: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      await findClient(input)
      const redirectUrl = new URL(input.redirectUri)
      if (input.approve) {
        const code = await database.oauth.createAuthorizationCode({
          clientId: input.clientId,
          userId: ctx.user.id,
          codeChallenge: input.codeChallenge,
          redirectUri: input.redirectUri,
          scopes: input.scope ? input.scope.split(' ') : [],
          resource: input.resource,
        })
        redirectUrl.searchParams.set('code', code)
      } else {
        redirectUrl.searchParams.set('error', 'access_denied')
      }
      if (input.state !== undefined) redirectUrl.searchParams.set('state', input.state)
      return { data: { redirectUrl: redirectUrl.href } }
    },
  })
}
