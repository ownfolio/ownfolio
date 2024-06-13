import BigNumber from 'bignumber.js'

import { dateEndOf, dateParse, DateUnit } from '../../../../shared/utils/date'
import { rpcClient } from '../../../api'
import { StockChartSeries } from '../../../components/StockChart'
import type { ChartViewSeries } from './index'
import { totalDepositSeries } from './totalDeposit'

export interface TotalSeriesConfig {
  type: 'total'
  portfolioId?: string
}

export const totalSeries: ChartViewSeries<TotalSeriesConfig> = async (
  resolution: DateUnit,
  config: TotalSeriesConfig
): Promise<StockChartSeries[]> => {
  const key = !config.portfolioId ? 'all' : config.portfolioId
  const data = await rpcClient
    .evaluateSummary({
      when: { type: 'historical', resolution },
      buckets: [!config.portfolioId ? { type: 'all' } : { type: 'portfolio', portfolioId: config.portfolioId }],
      values: ['total'],
    })
    .then(r => r.data)
  return [
    {
      id: `total-${key}`,
      type: 'line',
      label: 'Total',
      color: 'black',
      filled: false,
      staircase: false,
      points: data.value[key].map(([date, total]) => ({
        timestamp: dateEndOf(dateParse(date), 'day').valueOf(),
        value: BigNumber(total).toNumber(),
      })),
    },
    ...(await totalDepositSeries(resolution, { type: 'totalDeposit', portfolioId: config.portfolioId })),
  ]
}
