import { StockChartLineSeries, StockChartSeries, StockChartSeriesPoint } from '../../../components/StockChart'
import type { ChartViewTool } from './index'
import { ChartViewToolConfig } from './index'

export interface SimpleMovingAverageToolConfig {
  type: 'simpleMovingAverage'
  range: number
}

export function isSimpleMovingAverageToolConfig(config: ChartViewToolConfig, range: number): boolean {
  return config.type === 'simpleMovingAverage' && config.range === range
}

export const simpleMovingAverageTool: ChartViewTool<SimpleMovingAverageToolConfig> = (
  from: StockChartSeries,
  { range }: SimpleMovingAverageToolConfig
): StockChartLineSeries => {
  return {
    id: `${from.id}-sma-${range}`,
    label: `${from.label} (SMA ${range})`,
    type: 'line',
    color: 'blue',
    lineWidth: 1,
    staircase: false,
    filled: false,
    points: points(from, range),
  }
}

function points(from: StockChartSeries, range: number): StockChartSeriesPoint[] {
  switch (from.type) {
    case 'line':
      return from.points.reduce<{ previousPoints: number[]; result: StockChartSeriesPoint[] }>(
        (acc, p) => {
          if (p.value === undefined) {
            return acc
          }
          const previousPoints = [
            ...acc.previousPoints.slice(Math.max(acc.previousPoints.length - range + 1, 0), acc.previousPoints.length),
            p.value,
          ]
          if (previousPoints.length < range) {
            return { previousPoints, result: acc.result }
          }
          const point = {
            timestamp: p.timestamp,
            value: previousPoints.reduce((sum, value) => sum + value, 0) / range,
          }
          return { previousPoints, result: [...acc.result, point] }
        },
        { previousPoints: [], result: [] }
      ).result
    case 'candle':
      return from.points.reduce<{ previousPoints: number[]; result: StockChartSeriesPoint[] }>(
        (acc, p) => {
          const previousPoints = [
            ...acc.previousPoints.slice(Math.max(acc.previousPoints.length - range + 1, 0), acc.previousPoints.length),
            p.close,
          ]
          if (previousPoints.length < range) {
            return { previousPoints, result: acc.result }
          }
          const point = {
            timestamp: p.closeTimestamp,
            value: previousPoints.reduce((sum, value) => sum + value, 0) / range,
          }
          return { previousPoints, result: [...acc.result, point] }
        },
        { previousPoints: [], result: [] }
      ).result
    default:
      return []
  }
}
