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
  z.object({
    type: z.literal('holdings'),
  }),
])

export type DashboardCard = z.infer<typeof dashboardCardSchema>

export type DashboardCardType = DashboardCard['type']

export type DashboardCardTotal = Extract<DashboardCard, { type: 'total' }>

export type DashboardCardChange = Extract<DashboardCard, { type: 'change' }>

export type DashboardCardChart = Extract<DashboardCard, { type: 'chart' }>

export type DashboardCardHoldings = Extract<DashboardCard, { type: 'holdings' }>

export const dashboardRowSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('headline'),
    content: z.string(),
  }),
  z.object({
    type: z.literal('cards'),
    cards: z.array(dashboardCardSchema),
  }),
])

export type DashboardRow = z.infer<typeof dashboardRowSchema>

export type DashboardRowType = DashboardRow['type']

export type DashboardRowHeadline = Extract<DashboardRow, { type: 'headline' }>

export type DashboardRowCards = Extract<DashboardRow, { type: 'cards' }>

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

export function createEmptyDashboardRow(type: DashboardRowType): DashboardRow {
  switch (type) {
    case 'headline':
      return { type: 'headline', content: '' }
    case 'cards':
      return { type: 'cards', cards: [] }
  }
}

export function createEmptyDashboardCard(type: DashboardCardType): DashboardCard {
  switch (type) {
    case 'total':
      return { type: 'total' }
    case 'change':
      return { type: 'change', since: { type: 'toDate', interval: 'year' } }
    case 'chart':
      return { type: 'chart', config: { type: 'total', resolution: 'week', range: 'year', rangeAmount: 1 } }
    case 'holdings':
      return { type: 'holdings' }
  }
}
