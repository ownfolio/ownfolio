import { z } from 'zod'

import { dateUnitSchema } from '../utils/date'

export const dashboardCardSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('total'),
  }),
  z.object({
    type: z.literal('change'),
    since: z.discriminatedUnion('type', [z.object({ type: z.literal('toDate'), interval: dateUnitSchema })]),
  }),
  z.object({
    type: z.literal('chart'),
    config: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('total'),
        resolution: dateUnitSchema,
        range: dateUnitSchema,
        rangeAmount: z.number().min(1),
      }),
      z.object({
        type: z.literal('profit'),
        resolution: dateUnitSchema,
        range: dateUnitSchema,
        rangeAmount: z.number().min(1),
      }),
    ]),
  }),
])

export type DashboardCard = z.infer<typeof dashboardCardSchema>
