import { createRpcCall, RpcError } from '@ownfolio/rpc-core'

import { dateFormat } from '../../shared/utils/date'
import { fileSchema, renderDataUrl } from '../../shared/utils/file'
import { Database } from '../database'
import { generateReport, reportParamsSchema } from '../reports'
import { RpcCtx } from './context'
import { responseSchema } from './utils'

export type { RpcCtx } from './context'

export function createRpcV1Report(database: Database) {
  return {
    generateReport: createRpcCall(reportParamsSchema, responseSchema(fileSchema), async (ctx: RpcCtx, input) => {
      if (!ctx.user) throw RpcError.unauthorized()
      const pdf = await generateReport(database, ctx.user.id, input)
      const file = {
        fileName: `ownfolio-${input.type}-report-${dateFormat(new Date(), 'yyyyMMdd-HHMMSS')}.pdf`,
        dataUrl: renderDataUrl('application/pdf', pdf.toString('base64')),
      }
      return { data: file }
    }),
  }
}
