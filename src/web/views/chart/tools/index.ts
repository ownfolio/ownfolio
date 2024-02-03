import { StockChartSeries } from '../../../components/StockChart'
import { simpleMovingAverageTool, SimpleMovingAverageToolConfig } from './simpleMovingAverage'

export type ChartViewTool<C> = (from: StockChartSeries, config: C) => StockChartSeries

export type ChartViewToolConfig = SimpleMovingAverageToolConfig

export function chartViewTool(from: StockChartSeries, config: ChartViewToolConfig): StockChartSeries {
  switch (config.type) {
    case 'simpleMovingAverage':
      return simpleMovingAverageTool(from, config)
  }
}
