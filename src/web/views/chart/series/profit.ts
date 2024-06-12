import BigNumber from 'bignumber.js'

import { dateEndOf, dateParse, DateUnit } from '../../../../shared/utils/date'
import { rpcClient } from '../../../api'
import { StockChartSeries } from '../../../components/StockChart'
import type { ChartViewSeries } from './index'

export interface ProfitSeriesConfig {
  type: 'profit'
  portfolioId?: string
}

export const profitSeries: ChartViewSeries<ProfitSeriesConfig> = async (
  resolution: DateUnit,
  config: ProfitSeriesConfig
): Promise<StockChartSeries[]> => {
  const key = !config.portfolioId ? 'all' : config.portfolioId
  const data = await rpcClient
    .evaluateSummary({
      when: { type: 'historical', resolution },
      buckets: [!config.portfolioId ? { type: 'all' } : { type: 'portfolio', portfolioId: config.portfolioId }],
      values: ['total', 'deposit'],
    })
    .then(r => r.data)
  return [
    {
      type: 'line',
      label: 'Profit',
      color: 'black',
      filled: false,
      staircase: false,
      points: data.value[key].map(([date, total, deposit]) => ({
        timestamp: dateEndOf(dateParse(date), 'day').valueOf(),
        value: BigNumber(total).minus(deposit).toNumber(),
      })),
    },
  ]
}
