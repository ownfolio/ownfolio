import * as z from 'zod'

export const yearlyReportParamsSchema = z.object({
  type: z
    .literal('yearly')
    .describe('Table with cash, assets and total value at the end of each calendar year since the first transaction'),
})
export type YearlyReportParams = z.infer<typeof yearlyReportParamsSchema>

export const reportParamsSchema = z.discriminatedUnion('type', [yearlyReportParamsSchema])
export type ReportParams = z.infer<typeof reportParamsSchema>
