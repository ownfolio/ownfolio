import { z } from 'zod'

import { dateUnitSchema } from '../utils/date'
import { arrayIgnoringErrorsSchema } from '../utils/schemas'

const chartRangeShape = {
  resolution: dateUnitSchema.describe('Distance between two data points'),
  range: dateUnitSchema.describe('Unit of the time range shown, counted back from today'),
  rangeAmount: z.number().min(1).describe('Number of range units shown, e.g. range month and rangeAmount 6'),
}

export const dashboardElementSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('text').describe('Static text'),
      text: z.string().describe('Text to show'),
    }),
    z.object({
      type: z.literal('totalCard').describe('Current total value of all portfolios'),
      hideTitle: z.boolean().default(false),
      hideAbsoluteChange: z.boolean().default(false),
      hideRelativeChange: z.boolean().default(false),
    }),
    z.object({
      type: z.literal('changeCard').describe('Change of the total value over a period'),
      since: z
        .discriminatedUnion('type', [
          z.object({
            type: z.literal('toDate'),
            interval: dateUnitSchema.describe('Period to date, e.g. year for year-to-date'),
          }),
        ])
        .describe('Start of the period'),
      hideTitle: z.boolean().default(false),
      hideRelativeChange: z.boolean().default(false),
    }),
    z.object({
      type: z.literal('chartCard').describe('Line chart over time'),
      hideTitle: z.boolean().default(false),
      hideAxis: z.boolean().default(false),
      config: z.discriminatedUnion('type', [
        z.object({ type: z.literal('total').describe('Total value of all portfolios'), ...chartRangeShape }),
        z.object({ type: z.literal('profit').describe('Total value minus deposits'), ...chartRangeShape }),
        z.object({
          type: z.literal('asset').describe('Quotes of a single asset'),
          assetId: z.string().min(1).describe('ID of the asset to chart'),
          ...chartRangeShape,
        }),
      ]),
    }),
    z.object({
      type: z.literal('holdingsTableCard').describe('Table of all current holdings'),
    }),
  ])
  .describe('A card on the dashboard')

export type DashboardElement = z.infer<typeof dashboardElementSchema>

export type DashboardElementType = DashboardElement['type']

export type DashboardElementText = Extract<DashboardElement, { type: 'text' }>

export type DashboardElementTotalCard = Extract<DashboardElement, { type: 'totalCard' }>

export type DashboardElementChangeCard = Extract<DashboardElement, { type: 'changeCard' }>

export type DashboardElementChartCard = Extract<DashboardElement, { type: 'chartCard' }>

export type DashboardElementHoldingsTableCard = Extract<DashboardElement, { type: 'holdingsTableCard' }>

export const dashboardRowSchema = z.object({
  columns: z.array(dashboardElementSchema).max(4).describe('Cards shown side by side, at most 4'),
})

export type DashboardRow = z.infer<typeof dashboardRowSchema>

export const dashboardSchema = z
  .object({
    id: z.string().describe('ID of the dashboard'),
    userId: z.string().describe('ID of the owning user'),
    key: z.string().describe('Key of the dashboard, always "default"'),
    rows: z.array(dashboardRowSchema).describe('Rows shown from top to bottom'),
  })
  .describe('Layout of the start page of the web app')

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
