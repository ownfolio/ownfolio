import BigNumber from 'bignumber.js'

import { dateEndOf, dateParse, DateUnit } from '../../../../shared/utils/date'
import { rpcClient } from '../../../api'
import { StockChartSeries } from '../../../components/StockChart'
import type { ChartViewSeries } from './index'

export interface TotalDepositSeriesConfig {
  type: 'totalDeposit'
  portfolioId?: string
}

export const totalDepositSeries: ChartViewSeries<TotalDepositSeriesConfig> = async (
  resolution: DateUnit,
  config: TotalDepositSeriesConfig
): Promise<StockChartSeries[]> => {
  const key = !config.portfolioId ? 'all' : config.portfolioId
  const data = await rpcClient.evaluateSummary({
    when: { type: 'historical', resolution },
    buckets: [!config.portfolioId ? { type: 'all' } : { type: 'portfolio', portfolioId: config.portfolioId }],
    values: ['deposit'],
  })
  return [
    {
      type: 'line',
      label: 'Total Deposit',
      priority: -1,
      color: 'silver',
      filled: true,
      staircase: true,
      lineWidth: 1,
      points: data.value[key].map(([date, deposit]) => ({
        timestamp: dateEndOf(dateParse(date), 'day').valueOf(),
        value: BigNumber(deposit).toNumber(),
      })),
    },
  ]
}
