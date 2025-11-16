import { createRpcCallDefinition } from '@ownfolio/rpc-core'

import { reportParamsSchema } from '../models/Report'
import { fileSchema } from '../utils/file'
import { responseSchema } from '../utils/schemas'

export const rpcV1ReportDefinition = {
  generateReport: createRpcCallDefinition(reportParamsSchema, responseSchema(fileSchema)),
}
