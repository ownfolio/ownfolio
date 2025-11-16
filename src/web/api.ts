import { createRpcBrowserClient } from '@ownfolio/rpc-browser'

import { rpcV1Definition } from '../shared/api'

export const rpcClient = createRpcBrowserClient('/api/v1', rpcV1Definition)
