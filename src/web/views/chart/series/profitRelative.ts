import BigNumber from 'bignumber.js'

import { dateEndOf, dateParse, DateUnit } from '../../../../shared/utils/date'
import { rpcClient } from '../../../api'
import { StockChartSeries } from '../../../components/StockChart'
import type { ChartViewSeries } from './index'

export interface ProfitRelativeSeriesConfig {
  type: 'profitRelative'
  portfolioId?: string
}

export const profitRelativeSeries: ChartViewSeries<ProfitRelativeSeriesConfig> = async (
  resolution: DateUnit,
  config: ProfitRelativeSeriesConfig
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
      id: `profit-relative-${key}`,
      type: 'line',
      label: 'Profit (%)',
      color: 'black',
      filled: false,
      staircase: false,
      points: data.value[key].flatMap(([date, total, deposit]) => ({
        timestamp: dateEndOf(dateParse(date), 'day').valueOf(),
        value:
          BigNumber(deposit).isPositive() && !BigNumber(deposit).eq(0)
            ? BigNumber(total).dividedBy(deposit).minus(1).multipliedBy(100).toNumber()
            : 0,
      })),
    },
  ]
}
