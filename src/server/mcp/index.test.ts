// @vitest-environment node
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import crypto from 'crypto'
import express from 'express'
import fs from 'fs/promises'
import http from 'http'
import { AddressInfo } from 'net'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { applyAxiosMock } from '../../../test/axiosMock'
import { createApi, createRpcV1 } from '../api'
import { Config } from '../config'
import { Database } from '../database'
import { databaseTest } from '../database/databaseTest'
import { generateDemoPortfolio } from '../demo'
import { yahooFinanceAxios } from '../quotes/yahooFinance'
import { createMcpServer, mcpExcludedRpcCalls } from '.'
import { mcpToolDescriptions } from './descriptions'

const config: Config = {
  httpPort: 3000,
  publicUrl: 'http://localhost:3000',
  userRegistrationEnabled: false,
  trustProxyHops: 0,
  publicDirectory: '',
}

describe('mcp', () => {
  it('exposes every RPC call as a tool unless explicitly excluded', async () => {
    const rpcV1 = createRpcV1({} as Database, config)
    const rpcCallNames = Object.keys(rpcV1)
    for (const [name, call] of Object.entries(rpcV1)) {
      // undefined schemas are a symptom of circular imports in src/shared
      expect(call.inputSchema, `input schema of ${name} is undefined`).toBeDefined()
      expect(call.outputSchema, `output schema of ${name} is undefined`).toBeDefined()
      expect(() => z.toJSONSchema(call.inputSchema, { unrepresentable: 'any' }), name).not.toThrow()
      expect(() => z.toJSONSchema(call.outputSchema, { unrepresentable: 'any' }), name).not.toThrow()
    }
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
    // only calls without result data have no output schema
    expect(tools.filter(t => !t.outputSchema).map(t => t.name)).toEqual([
      'ping',
      'deleteAccount',
      'deleteAsset',
      'deletePortfolio',
      'updateQuoteForAsset',
      'deleteQuoteForAsset',
      'deleteTransaction',
      'changePassword',
      'importUserTransactionsFromCsv',
      'linkAttachmentToTransaction',
      'unlinkAttachmentFromTransaction',
      'deleteAttachment',
      'deleteCategorization',
      'deleteCategory',
    ])
  })

  it(
    'returns results matching the output schemas',
    databaseTest(async db => {
      await db.init()
      const user = await db.users.create({ email: 'user@domain.com' }, 'password')
      // reuses the quotes recorded for the report test, the mock data is never saved from here
      await applyAxiosMock(yahooFinanceAxios, path.resolve(__dirname, '../api/report.test.mock.json'))
      await generateDemoPortfolio(db, user.id)
      const rpcV1 = createRpcV1(db, config)
      const server = createMcpServer(rpcV1, { user, setSessionId: async () => {}, unsetSessionId: async () => {} })
      const client = new Client({ name: 'test', version: '0.0.0' })
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
      // the client only validates structured content against output schemas it has seen
      await client.listTools()
      const called = new Set<string>()
      const call = async (name: string, args?: Record<string, unknown>): Promise<any> => {
        called.add(name)
        const result = await client.callTool({ name, arguments: args })
        expect(result.isError, `${name}: ${JSON.stringify(result.content)}`).toBeFalsy()
        return (result.structuredContent as { data: unknown } | undefined)?.data
      }

      try {
        await call('ping')
        await call('version')
        await call('me')
        await call('changeEmail', { newEmail: 'user2@domain.com', password: 'password' })

        const [portfolio] = await call('listPortfolios')
        await call('retrievePortfolio', { id: portfolio.id })
        const portfolio2 = await call('createPortfolio', { name: 'Second' })
        await call('updatePortfolio', { ...portfolio2, name: 'Second renamed' })
        await call('updatePortfolioStatus', { id: portfolio2.id, status: 'inactive' })

        const accounts = await call('listAccounts')
        await call('retrieveAccount', { id: accounts[0].id })
        const account = await call('createAccount', { portfolioId: portfolio2.id, name: 'Account', currency: 'EUR' })
        await call('updateAccount', { ...account, name: 'Account renamed' })
        await call('updateAccountStatus', { id: account.id, status: 'hidden' })

        const assets = await call('listAssets')
        await call('retrieveAsset', { id: assets[0].id })
        const asset = await call('createAsset', { name: 'Asset', symbol: 'AST', currency: 'EUR' })
        await call('updateAsset', { ...asset, denomination: 2 })
        await call('updateAssetStatus', { id: asset.id, status: 'inactive' })

        // the demo portfolio comes with three categorizations
        expect((await call('listCategorizations')).map((c: { name: string }) => c.name)).toEqual([
          'Liquidity',
          'Region',
          'Risk profile',
        ])
        expect(await call('listCategoryAssignments')).toHaveLength(26)
        const categorization = await call('createCategorization', { name: 'Region' })
        await call('retrieveCategorization', { id: categorization.id })
        await call('updateCategorization', { ...categorization, name: 'Region renamed' })
        const category = await call('createCategory', { categorizationId: categorization.id, name: 'EU' })
        const subCategory = await call('createCategory', {
          categorizationId: categorization.id,
          parentCategoryId: category.id,
          name: 'Germany',
        })
        await call('listCategories', { categorizationId: categorization.id })
        await call('retrieveCategory', { id: subCategory.id })
        await call('updateCategory', { ...subCategory, name: 'France' })
        await call('setCategoryAssignments', {
          categorizationId: categorization.id,
          assetId: asset.id,
          assignments: [{ categoryId: subCategory.id, fraction: '0.7' }],
        })
        expect(await call('listCategoryAssignments', { categorizationId: categorization.id })).toMatchObject([
          { categoryId: subCategory.id, accountId: null, assetId: asset.id, fraction: '0.7' },
        ])
        await call('deleteCategory', { id: subCategory.id })
        await call('deleteCategorization', { id: categorization.id })

        // the demo portfolio just fetched its quotes, so the providers are paused and nothing is requested
        await call('updateQuotes')
        await call('updateQuoteForAsset', { assetId: asset.id, date: '2020-01-01', close: '10.5' })
        await call('listLatestQuotes')
        await call('listLatestQuotes', { date: '2020-01-01' })
        await call('listQuotesForAsset', { id: asset.id })
        expect(await call('retrieveQuoteForAsset', { id: asset.id, date: '2019-01-01' })).toBeNull()
        expect(await call('retrieveQuoteForAsset', { id: asset.id, date: '2020-06-01' })).toMatchObject({
          close: '10.5',
          open: null,
        })

        const transactions = await call('listTransactions')
        expect(transactions.length).toBeGreaterThan(0)
        await call('listTransactions', { accountId: accounts[0].id, top: 5 })
        await call('retrieveTransaction', { id: transactions[0].id })
        const transaction = await call('createTransaction', {
          date: '2020-01-02',
          time: '10:00:00',
          reference: '',
          comment: '',
          data: {
            type: 'assetBuy',
            assetAccountId: account.id,
            assetId: asset.id,
            assetAmount: '3',
            cashAccountId: account.id,
            cashAmount: '31.5',
            feeCashAmount: '1',
          },
        })
        expect(transaction.data.cashAmount).toBe('31.5')
        await call('updateTransaction', { ...transaction, comment: 'Updated' })

        for (const when of [{ type: 'now' }, { type: 'dates', dates: ['2020-01-02'] }]) {
          await call('evaluateBalances', { when })
        }
        await call('evaluateBalances', { when: { type: 'historical', resolution: 'month' } })
        await call('evaluateSummary', {
          when: { type: 'historical', resolution: 'month' },
          buckets: [
            { type: 'all' },
            { type: 'portfolio', portfolioId: portfolio.id },
            { type: 'account', accountId: account.id },
          ],
          values: ['total', 'deposit', 'cash', 'assetsOpenPrice', 'assetsCurrentPrice', 'realizedProfits'],
        })
        await call('evaluatePositions', { when: { type: 'now' } })
        await call('evaluatePositions', { when: { type: 'date', date: '2020-01-02' } })
        await call('evaluatePlausibility')

        const dashboard = await call('retrieveDefaultDashboard')
        await call('updateDefaultDashboard', { ...dashboard, rows: dashboard.rows.slice(0, 1) })

        const csv = await call('exportUserTransactionsAsCsv')
        expect(csv.dataUrl).toMatch(/^data:text\/csv;base64,/)
        const report = await call('generateReport', { type: 'yearly' })
        const attachment = await call('uploadAttachment', { fileName: 'report.pdf', dataUrl: report.dataUrl })
        await call('listAttachments')
        await call('retrieveAttachment', { id: attachment.id })
        expect(await call('retrieveAttachmentContent', { id: attachment.id })).toEqual({ parsed: null })
        const statementPdf = await fs.readFile(path.resolve(__dirname, '../pdf/parse/ingDiBa/test-sell.pdf'))
        const statement = await call('uploadAttachment', {
          fileName: 'statement.pdf',
          dataUrl: `data:application/pdf;base64,${statementPdf.toString('base64')}`,
        })
        expect(await call('retrieveAttachmentContent', { id: statement.id })).toMatchObject({
          parsed: { type: 'assetSell', assetAmount: expect.any(String), tax: expect.any(String) },
        })
        const upload = await call('createAttachmentUploadUrl', { fileName: 'statement.pdf' })
        expect(upload.curlCommand).toContain(upload.token)
        await call('downloadAttachment', { id: attachment.id })
        await call('downloadPdfAttachmentAsText', { id: attachment.id })
        await call('downloadPdfAttachmentAsPngs', { id: attachment.id })
        await call('linkAttachmentToTransaction', { id: attachment.id, transactionId: transaction.id })
        await call('listAttachments', { transactionId: transaction.id })
        await call('unlinkAttachmentFromTransaction', { id: attachment.id, transactionId: transaction.id })

        const toolsWithOutputSchema = (await client.listTools()).tools.filter(t => t.outputSchema).map(t => t.name)
        expect(
          toolsWithOutputSchema.filter(name => !called.has(name)),
          'tools with output schema not called'
        ).toEqual([])
      } finally {
        await client.close()
      }
    }),
    120000
  )

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
