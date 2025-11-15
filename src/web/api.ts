import { createRpcBrowserClient } from '@ownfolio/rpc-browser'

import type { RpcV1 } from '../server/api'

export const rpcClient = createRpcBrowserClient<RpcV1>('/api/v1', {})
