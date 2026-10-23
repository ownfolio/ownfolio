// @vitest-environment node
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import crypto from 'crypto'
import express from 'express'
import http from 'http'
import { AddressInfo } from 'net'
import { describe, expect, it } from 'vitest'

import { createApi, createRpcV1 } from '../api'
import { Config } from '../config'
import { Database } from '../database'
import { databaseTest } from '../database/databaseTest'
import { createMcpServer, mcpExcludedRpcCalls } from '.'
import { mcpToolDescriptions } from './descriptions'

const config: Config = {
  httpPort: 3000,
  publicUrl: 'http://localhost:3000',
  userRegistrationEnabled: false,
  publicDirectory: '',
}

describe('mcp', () => {
  it('exposes every RPC call as a tool unless explicitly excluded', async () => {
    const rpcV1 = createRpcV1({} as Database, config)
    const rpcCallNames = Object.keys(rpcV1)
    for (const name of Object.keys(mcpExcludedRpcCalls)) {
      expect(rpcCallNames, `excluded RPC call ${name} does not exist`).toContain(name)
    }

    const server = createMcpServer(rpcV1, { setSessionId: async () => {}, unsetSessionId: async () => {} })
    const client = new Client({ name: 'test', version: '0.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    const { tools } = await client.listTools()
    await client.close()

    const expectedToolNames = rpcCallNames.filter(name => !(name in mcpExcludedRpcCalls))
    expect(tools.map(t => t.name).sort()).toEqual(expectedToolNames.sort())
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.description, `tool ${tool.name} has no description`).toBeTruthy()
    }
    for (const name of Object.keys(mcpToolDescriptions)) {
      expect(expectedToolNames, `described tool ${name} does not exist`).toContain(name)
    }
  })

  it(
    'authorizes via OAuth and calls tools',
    databaseTest(async db => {
      await db.init()
      const user = await db.users.create({ email: 'user@domain.com' }, 'password')
      await withServer(db, async (baseUrl, rpcV1) => {
        const mcpUrl = new URL('/mcp', baseUrl)

        const unauthorized = await fetch(mcpUrl, { method: 'POST' })
        expect(unauthorized.status).toBe(401)
        expect(unauthorized.headers.get('www-authenticate')).toContain('/.well-known/oauth-protected-resource/mcp')

        const metadata = await fetch(new URL('/.well-known/oauth-authorization-server', baseUrl)).then(r => r.json())
        expect(metadata.issuer).toBe(baseUrl + '/')

        const redirectUri = 'http://localhost:9999/callback'
        const client = await fetch(metadata.registration_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: 'Test',
            redirect_uris: [redirectUri],
            token_endpoint_auth_method: 'none',
          }),
        }).then(r => r.json())

        const codeVerifier = crypto.randomBytes(32).toString('base64url')
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
        const authorizeUrl = new URL(metadata.authorization_endpoint)
        authorizeUrl.search = new URLSearchParams({
          response_type: 'code',
          client_id: client.client_id,
          redirect_uri: redirectUri,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          state: 'state1',
          resource: mcpUrl.href,
        }).toString()
        const authorize = await fetch(authorizeUrl, { redirect: 'manual' })
        expect(authorize.status).toBe(302)
        const consentUrl = new URL(authorize.headers.get('location')!, baseUrl)
        expect(consentUrl.pathname).toBe('/oauth/authorize')

        const request = {
          clientId: consentUrl.searchParams.get('client_id')!,
          redirectUri: consentUrl.searchParams.get('redirect_uri')!,
          codeChallenge: consentUrl.searchParams.get('code_challenge')!,
          state: consentUrl.searchParams.get('state') ?? undefined,
          resource: consentUrl.searchParams.get('resource') ?? undefined,
        }
        const ctx = { user, setSessionId: async () => {}, unsetSessionId: async () => {} }
        await expect(
          rpcV1.decideOAuthAuthorization.handler(ctx, {
            ...request,
            redirectUri: 'http://evil/callback',
            approve: true,
          })
        ).rejects.toThrow('Redirect URI is not registered')
        const denied = await rpcV1.decideOAuthAuthorization.handler(ctx, { ...request, approve: false })
        expect(new URL(denied.data.redirectUrl).searchParams.get('error')).toBe('access_denied')
        const approved = await rpcV1.decideOAuthAuthorization.handler(ctx, { ...request, approve: true })
        const callbackUrl = new URL(approved.data.redirectUrl)
        expect(callbackUrl.searchParams.get('state')).toBe('state1')
        const code = callbackUrl.searchParams.get('code')!

        const requestToken = (params: Record<string, string>) =>
          fetch(metadata.token_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: client.client_id, ...params }).toString(),
          })
        const wrongVerifier = await requestToken({
          grant_type: 'authorization_code',
          code,
          code_verifier: 'wrong',
          redirect_uri: redirectUri,
        })
        expect(wrongVerifier.status).toBe(400)
        const tokens = await requestToken({
          grant_type: 'authorization_code',
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          resource: mcpUrl.href,
        }).then(r => r.json())
        expect(tokens.access_token).toMatch(/^ofa_/)
        expect(tokens.refresh_token).toMatch(/^ofr_/)
        const reusedCode = await requestToken({
          grant_type: 'authorization_code',
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
        })
        expect(reusedCode.status).toBe(400)

        const callTool = async (accessToken: string, name: string, args?: Record<string, unknown>) => {
          const mcpClient = new Client({ name: 'test', version: '0.0.0' })
          await mcpClient.connect(
            new StreamableHTTPClientTransport(mcpUrl, {
              requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
            })
          )
          try {
            return await mcpClient.callTool({ name, arguments: args })
          } finally {
            await mcpClient.close()
          }
        }
        const created = await callTool(tokens.access_token, 'createPortfolio', { name: 'Via MCP', status: 'active' })
        expect(created.isError).toBeFalsy()
        const me = await callTool(tokens.access_token, 'me')
        expect(JSON.parse((me.content as { text: string }[])[0].text).data.id).toBe(user.id)
        const invalidInput = await callTool(tokens.access_token, 'retrievePortfolio', { id: 42 })
        expect(invalidInput.isError).toBe(true)
        await expect(db.portfolios.listByUserId(user.id)).resolves.toMatchObject([{ name: 'Via MCP' }])

        const refreshed = await requestToken({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }).then(
          r => r.json()
        )
        expect(refreshed.access_token).not.toBe(tokens.access_token)
        const reusedRefreshToken = await requestToken({
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
        })
        expect(reusedRefreshToken.status).toBe(400)

        await fetch(metadata.revocation_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: client.client_id, token: refreshed.access_token }).toString(),
        })
        await expect(callTool(refreshed.access_token, 'me')).rejects.toThrow()
      })
    }),
    60000
  )
})

async function withServer(
  database: Database,
  fn: (baseUrl: string, rpcV1: ReturnType<typeof createRpcV1>) => Promise<void>
): Promise<void> {
  const app = express()
  const server = http.createServer(app)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
    const testConfig = { ...config, publicUrl: baseUrl }
    app.use(await createApi(database, testConfig))
    await fn(baseUrl, createRpcV1(database, testConfig))
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}
