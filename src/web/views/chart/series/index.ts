import { groupBy, maxBy, minBy } from '../../../../shared/utils/array'
import { dateEndOf, dateStartOf, DateUnit } from '../../../../shared/utils/date'
import { StockChartSeries } from '../../../components/StockChart'
import { assetSeries, AssetSeriesConfig } from './asset'
import { assetTransactionsSeries, AssetTransactionsSeriesConfig } from './assetTransactions'
import { profitSeries, ProfitSeriesConfig } from './profit'
import { profitRelativeSeries, ProfitRelativeSeriesConfig } from './profitRelative'
import { totalSeries, TotalSeriesConfig } from './total'
import { totalDepositSeries, TotalDepositSeriesConfig } from './totalDeposit'

export type ChartViewSeries<C> = (resolution: DateUnit, config: C) => Promise<StockChartSeries[]>

export type ChartViewSeriesConfig =
  | TotalSeriesConfig
  | TotalDepositSeriesConfig
  | ProfitSeriesConfig
  | ProfitRelativeSeriesConfig
  | AssetSeriesConfig
  | AssetTransactionsSeriesConfig

export async function chartViewSeries(
  resolution: DateUnit,
  config: ChartViewSeriesConfig
): Promise<StockChartSeries[]> {
  switch (config.type) {
    case 'total':
      return totalSeries(resolution, config)
    case 'totalDeposit':
      return totalDepositSeries(resolution, config)
    case 'profit':
      return profitSeries(resolution, config)
    case 'profitRelative':
      return profitRelativeSeries(resolution, config)
    case 'asset':
      return assetSeries(resolution, config)
    case 'assetTransactions':
      return assetTransactionsSeries(resolution, config)
  }
}

export function chartSeriesAsCandle(series: StockChartSeries, resolution: DateUnit): StockChartSeries {
  if (series.type === 'candle') {
    return {
      type: 'candle',
      id: `${series.id}-as-candle`,
      label: series.label,
      points: groupBy(series.points, p => dateStartOf(new Date(p.openTimestamp), resolution).valueOf().toString()).map(
        ps => {
          return {
            openTimestamp: dateStartOf(new Date(ps[0].openTimestamp), resolution).valueOf(),
            closeTimestamp: dateEndOf(new Date(ps[ps.length - 1].closeTimestamp), resolution).valueOf(),
            open: ps[0].open!,
            high: maxBy(ps, p => p.high)!.high,
            low: minBy(ps, p => p.low)!.low,
            close: ps[ps.length - 1].close!,
          }
        }
      ),
    }
  } else {
    return {
      type: 'candle',
      id: `${series.id}-as-candle`,
      label: series.label,
      points: groupBy(
        series.points.filter(p => typeof p.value === 'number'),
        p => dateStartOf(new Date(p.timestamp), resolution).valueOf().toString()
      ).map(ps => {
        return {
          openTimestamp: dateStartOf(new Date(ps[0].timestamp), resolution).valueOf(),
          closeTimestamp: dateEndOf(new Date(ps[ps.length - 1].timestamp), resolution).valueOf(),
          open: ps[0].value!,
          high: maxBy(ps, p => p.value!)!.value!,
          low: minBy(ps, p => p.value!)!.value!,
          close: ps[ps.length - 1].value!,
        }
      }),
    }
  }
}
