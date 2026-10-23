import { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js'
import { InvalidGrantError, InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js'
import { AuthorizationParams, OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js'
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import express from 'express'

import { Database } from '../database'
import { OAuthTokenPair } from '../database/oauth'

export const oauthConsentPath = '/oauth/authorize'

export class OwnfolioOAuthProvider implements OAuthServerProvider {
  constructor(
    private readonly database: Database,
    private readonly resourceUrl: URL
  ) {}

  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: clientId => this.database.oauth.findClient(clientId),
      registerClient: client => this.database.oauth.createClient(client as OAuthClientInformationFull),
    }
  }

  // the user has to approve the client in the web app, which then issues the authorization code
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: express.Response) {
    const query = new URLSearchParams({
      client_id: client.client_id,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
    })
    if (params.state !== undefined) query.set('state', params.state)
    if (params.scopes?.length) query.set('scope', params.scopes.join(' '))
    if (params.resource) query.set('resource', params.resource.href)
    res.redirect(302, `${oauthConsentPath}?${query.toString()}`)
  }

  async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string) {
    const code = await this.database.oauth.findAuthorizationCode(client.client_id, authorizationCode)
    if (!code) throw new InvalidGrantError('Invalid authorization code')
    return code.codeChallenge
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
    resource?: URL
  ): Promise<OAuthTokens> {
    const code = await this.database.oauth.consumeAuthorizationCode(client.client_id, authorizationCode)
    if (!code) throw new InvalidGrantError('Invalid authorization code')
    if (redirectUri !== undefined && redirectUri !== code.redirectUri) {
      throw new InvalidGrantError('Redirect URI does not match the authorization request')
    }
    if (resource && code.resource && resource.href !== code.resource) {
      throw new InvalidGrantError('Resource does not match the authorization request')
    }
    const tokens = await this.database.oauth.createTokens({
      clientId: code.clientId,
      userId: code.userId,
      scopes: code.scopes,
      resource: code.resource,
    })
    return tokenPairToOAuthTokens(tokens)
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL
  ): Promise<OAuthTokens> {
    const grant = await this.database.oauth.consumeRefreshToken(client.client_id, refreshToken)
    if (!grant) throw new InvalidGrantError('Invalid refresh token')
    if (scopes && scopes.some(scope => !grant.scopes.includes(scope))) {
      throw new InvalidGrantError('Requested scopes exceed the original grant')
    }
    if (resource && grant.resource && resource.href !== grant.resource) {
      throw new InvalidGrantError('Resource does not match the original grant')
    }
    const tokens = await this.database.oauth.createTokens({ ...grant, scopes: scopes ?? grant.scopes })
    return tokenPairToOAuthTokens(tokens)
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const accessToken = await this.database.oauth.findAccessToken(token)
    if (!accessToken) throw new InvalidTokenError('Invalid access token')
    if (accessToken.resource && accessToken.resource !== this.resourceUrl.href) {
      throw new InvalidTokenError('Access token was issued for a different resource')
    }
    return {
      token,
      clientId: accessToken.clientId,
      scopes: accessToken.scopes,
      expiresAt: accessToken.expiresAt,
      resource: accessToken.resource ? new URL(accessToken.resource) : undefined,
      extra: { userId: accessToken.userId },
    }
  }

  async revokeToken(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
    await this.database.oauth.revokeToken(client.client_id, request.token)
  }
}

function tokenPairToOAuthTokens(tokens: OAuthTokenPair): OAuthTokens {
  return {
    access_token: tokens.accessToken,
    token_type: 'bearer',
    expires_in: tokens.expiresIn,
    refresh_token: tokens.refreshToken,
    scope: tokens.scopes.length > 0 ? tokens.scopes.join(' ') : undefined,
  }
}
