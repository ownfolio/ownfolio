import { z } from 'zod'

import { Database } from '../database'
import { generateYearlyReport, yearlyReportParamsSchema } from './yearly'

export type ReportGenerator<T> = (database: Database, userId: string, params: T) => Promise<Buffer<ArrayBufferLike>>

export const reportParamsSchema = z.discriminatedUnion('type', [yearlyReportParamsSchema])

export type ReportParams = z.infer<typeof reportParamsSchema>

export const generateReport: ReportGenerator<ReportParams> = async (database, userId, params) => {
  switch (params.type) {
    case 'yearly': {
      return generateYearlyReport(database, userId, params)
    }
    default:
      throw Error(`Unsupported report type ${params.type}`)
  }
}
