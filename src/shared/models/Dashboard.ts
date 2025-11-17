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

export const dashboardRowSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('holdings'),
  }),
  z.object({
    type: z.literal('cards'),
    cards: z.array(dashboardCardSchema),
  }),
])

export type DashboardRow = z.infer<typeof dashboardRowSchema>

export const dashboardSchema = z.object({
  id: z.string(),
  userId: z.string(),
  key: z.string(),
  rows: z.array(dashboardRowSchema),
})

export type Dashboard = z.infer<typeof dashboardSchema>

export function createEmptyDashboard(): Dashboard {
  return {
    id: '',
    userId: '',
    key: '',
    rows: [],
  }
}
