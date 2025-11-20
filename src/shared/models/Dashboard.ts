import { z } from 'zod'

import { dateUnitSchema } from '../utils/date'
import { arrayIgnoringErrorsSchema } from '../utils/schemas'

export const dashboardElementSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('totalCard'),
    hideTitle: z.boolean().default(false),
    hideAbsoluteChange: z.boolean().default(false),
    hideRelativeChange: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('changeCard'),
    since: z.discriminatedUnion('type', [z.object({ type: z.literal('toDate'), interval: dateUnitSchema })]),
    hideTitle: z.boolean().default(false),
    hideRelativeChange: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('chartCard'),
    hideTitle: z.boolean().default(false),
    hideAxis: z.boolean().default(false),
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
      z.object({
        type: z.literal('asset'),
        assetId: z.string().min(1),
        resolution: dateUnitSchema,
        range: dateUnitSchema,
        rangeAmount: z.number().min(1),
      }),
    ]),
  }),
  z.object({
    type: z.literal('holdingsTableCard'),
  }),
])

export type DashboardElement = z.infer<typeof dashboardElementSchema>

export type DashboardElementType = DashboardElement['type']

export type DashboardElementText = Extract<DashboardElement, { type: 'text' }>

export type DashboardElementTotalCard = Extract<DashboardElement, { type: 'totalCard' }>

export type DashboardElementChangeCard = Extract<DashboardElement, { type: 'changeCard' }>

export type DashboardElementChartCard = Extract<DashboardElement, { type: 'chartCard' }>

export type DashboardElementHoldingsTableCard = Extract<DashboardElement, { type: 'holdingsTableCard' }>

export const dashboardRowSchema = z.object({
  columns: z.array(dashboardElementSchema).max(4),
})

export type DashboardRow = z.infer<typeof dashboardRowSchema>

export const dashboardSchema = z.object({
  id: z.string(),
  userId: z.string(),
  key: z.string(),
  rows: z.array(dashboardRowSchema),
})

export const dashboardSchemaForgiving = dashboardSchema.extend({
  rows: arrayIgnoringErrorsSchema(
    dashboardRowSchema.extend({
      columns: arrayIgnoringErrorsSchema(dashboardElementSchema),
    })
  ),
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

export function createEmptyDashboardRow(): DashboardRow {
  return { columns: [] }
}

export function createEmptyDashboardElement(type: DashboardElementType = 'totalCard'): DashboardElement {
  switch (type) {
    case 'text':
      return { type: 'text', text: '' }
    case 'totalCard':
      return { type: 'totalCard', hideTitle: false, hideAbsoluteChange: false, hideRelativeChange: false }
    case 'changeCard':
      return {
        type: 'changeCard',
        since: { type: 'toDate', interval: 'year' },
        hideTitle: false,
        hideRelativeChange: false,
      }
    case 'chartCard':
      return {
        type: 'chartCard',
        config: { type: 'total', resolution: 'week', range: 'year', rangeAmount: 1 },
        hideTitle: false,
        hideAxis: false,
      }
    case 'holdingsTableCard':
      return { type: 'holdingsTableCard' }
  }
}
