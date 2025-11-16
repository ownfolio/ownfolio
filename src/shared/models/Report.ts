import * as z from 'zod'

export const yearlyReportParamsSchema = z.object({ type: z.literal('yearly') })
export type YearlyReportParams = z.infer<typeof yearlyReportParamsSchema>

export const reportParamsSchema = z.discriminatedUnion('type', [yearlyReportParamsSchema])
export type ReportParams = z.infer<typeof reportParamsSchema>
