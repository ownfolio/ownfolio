import { createRpcRouterFromDefinitionAndHandler, RpcError } from '@ownfolio/rpc-core'

import { rpcV1ReportDefinition } from '../../shared/api/report'
import { dateFormat } from '../../shared/utils/date'
import { renderDataUrl } from '../../shared/utils/file'
import { Database } from '../database'
import { generateReport } from '../reports'
import { RpcCtx } from './context'

export type { RpcCtx } from './context'

export function createRpcV1Report(database: Database) {
  return createRpcRouterFromDefinitionAndHandler<RpcCtx, typeof rpcV1ReportDefinition>(rpcV1ReportDefinition, {
    generateReport: async (ctx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const pdf = await generateReport(database, ctx.user.id, input)
      const file = {
        fileName: `ownfolio-${input.type}-report-${dateFormat(new Date(), 'yyyyMMdd-HHMMSS')}.pdf`,
        dataUrl: renderDataUrl('application/pdf', pdf.toString('base64')),
      }
      return { data: file }
    },
  })
}
