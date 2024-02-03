import { RpcBrowserClientError } from '@choffmeister/rpc-browser'

export interface ParsedError {
  title: string
  description?: string
}

export function parseError(err: unknown): ParsedError {
  if (err instanceof RpcBrowserClientError) {
    return {
      title: 'RPC call failed',
      description: err.message,
    }
  }

  if (err instanceof Error) {
    return {
      title: 'Unknown error',
      description: err.message,
    }
  }

  return {
    title: 'Unknown error',
  }
}
