import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { dashboardSchema } from '../models/Dashboard'
import { responseSchema } from '../utils/schemas'

export const rpcV1DashboardDefinition = {
  retrieveDefaultDashboard: createRpcCallDefinition(z.void(), responseSchema(dashboardSchema)),
  updateDefaultDashboard: createRpcCallDefinition(dashboardSchema, responseSchema(dashboardSchema)),
}
