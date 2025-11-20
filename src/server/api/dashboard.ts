import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1DashboardDefinition } from '../../shared/api/dashboard'
import { Dashboard } from '../../shared/models/Dashboard'
import { Database } from '../database'
import { RpcCtx } from './context'

export function createRpcV1Dashboard(database: Database) {
  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1DashboardDefinition>(rpcV1DashboardDefinition, {
    retrieveDefaultDashboard: async ctx => {
      if (!ctx.user) throw RpcError.unauthorized()
      const dashboard =
        (await database.dashboards.retriveUserIdAndKey(ctx.user.id, 'default')) ||
        (await database.dashboards.create(defaultDashboard(ctx.user.id)))
      return { data: dashboard }
    },
    updateDefaultDashboard: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const dashboard = await database.dashboards.find(input.id)
      if (!dashboard || dashboard.userId !== ctx.user.id) throw RpcError.badRequest(`Unknown dashboard ${input.id}`)
      if (input.key !== 'default' || dashboard.key !== 'default') throw RpcError.badRequest('Must be default dashboard')
      await database.dashboards.update(input)
      return { data: input }
    },
  })
}

function defaultDashboard(userId: string): Dashboard {
  return {
    id: '',
    userId: userId,
    key: 'default',
    rows: [
      {
        columns: [
          { type: 'totalCard', hideTitle: false, hideAbsoluteChange: false, hideRelativeChange: false },
          {
            type: 'changeCard',
            since: { type: 'toDate', interval: 'day' },
            hideTitle: false,
            hideRelativeChange: false,
          },
          {
            type: 'changeCard',
            since: { type: 'toDate', interval: 'month' },
            hideTitle: false,
            hideRelativeChange: false,
          },
        ],
      },
      {
        columns: [
          {
            type: 'chartCard',
            config: { type: 'profit', resolution: 'week', range: 'month', rangeAmount: 6 },
            hideTitle: false,
            hideAxis: false,
          },
        ],
      },
      {
        columns: [{ type: 'holdingsTableCard' }],
      },
    ],
  }
}
