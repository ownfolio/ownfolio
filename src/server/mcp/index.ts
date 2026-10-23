import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js'
import { getOAuthProtectedResourceMetadataUrl, mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { AnyRpcCall, isRpcError, isRpcVoid, RpcError } from '@ownfolio/rpc-core'
import express from 'express'

import type { createRpcV1, RpcCtx } from '../api'
import { Config } from '../config'
import { Database } from '../database'
import { logger } from '../logger'
import { OwnfolioOAuthProvider } from './oauthProvider'

type RpcV1 = ReturnType<typeof createRpcV1>

// Every RPC call is exposed as an MCP tool, except for the ones listed here. Each exclusion needs a reason.
export const mcpExcludedRpcCalls: Partial<Record<keyof RpcV1, string>> = {
  register: 'MCP clients authenticate via OAuth instead of session cookies',
  login: 'MCP clients authenticate via OAuth instead of session cookies',
  logout: 'MCP clients authenticate via OAuth instead of session cookies, tokens are revoked via /revoke',
  retrieveOAuthClient: 'part of the interactive OAuth consent in the web app',
  decideOAuthAuthorization: 'part of the interactive OAuth consent in the web app',
}

const readOnlyRpcCallPattern = /^(list|retrieve|download|export|generate|evaluate|me$|ping$|version$)/

export function createMcpServer(rpcV1: RpcV1, ctx: RpcCtx): McpServer {
  const server = new McpServer({ name: 'ownfolio', version: 'dev' })
  for (const [name, call] of Object.entries(rpcV1) as [string, AnyRpcCall<RpcCtx>][]) {
    if (name in mcpExcludedRpcCalls) {
      continue
    }
    const run = (input: unknown) => runRpcCall(call, ctx, input)
    const config = {
      title: rpcCallNameToTitle(name),
      annotations: { readOnlyHint: readOnlyRpcCallPattern.test(name) },
    }
    if (isRpcVoid(call.inputSchema)) {
      server.registerTool(name, config, () => run(undefined))
    } else {
      server.registerTool(name, { ...config, inputSchema: call.inputSchema }, (input: unknown) => run(input))
    }
  }
  return server
}

export function createMcp(database: Database, config: Config, rpcV1: RpcV1): express.Router {
  const router = express.Router()
  const mcpUrl = new URL('/mcp', config.publicUrl)
  const provider = new OwnfolioOAuthProvider(database, mcpUrl)

  router.use(
    mcpAuthRouter({
      provider,
      issuerUrl: new URL(config.publicUrl),
      resourceServerUrl: mcpUrl,
      resourceName: 'ownfolio',
    })
  )

  router.post(
    '/mcp',
    requireBearerAuth({ verifier: provider, resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpUrl) }),
    express.json({ limit: '10mb' }),
    async (req, res) => {
      try {
        const userId = req.auth?.extra?.userId
        const user = typeof userId === 'string' ? await database.users.find(userId) : undefined
        const ctx: RpcCtx = {
          user,
          setSessionId: async () => {
            throw RpcError.badRequest('Sessions are not supported via MCP')
          },
          unsetSessionId: async () => {},
        }
        const server = createMcpServer(rpcV1, ctx)
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
        res.on('close', () => {
          transport.close()
          server.close()
        })
        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)
      } catch (error) {
        logger.error('Handling MCP request failed', { error })
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null })
        }
      }
    }
  )

  // the server is stateless, so there are no SSE streams or sessions to open or close
  router.all('/mcp', (_req, res) => {
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null })
  })

  return router
}

async function runRpcCall(call: AnyRpcCall<RpcCtx>, ctx: RpcCtx, input: unknown): Promise<CallToolResult> {
  try {
    const output = await call.handler(ctx, input)
    const text = isRpcVoid(call.outputSchema) ? 'OK' : JSON.stringify(output)
    return { content: [{ type: 'text', text }] }
  } catch (error) {
    if (isRpcError(error)) {
      return { isError: true, content: [{ type: 'text', text: `${error.status}: ${error.message}` }] }
    }
    logger.error('MCP tool call failed', { error })
    return { isError: true, content: [{ type: 'text', text: 'Internal server error' }] }
  }
}

function rpcCallNameToTitle(name: string): string {
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
