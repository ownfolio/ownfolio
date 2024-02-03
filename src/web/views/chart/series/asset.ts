import { groupBy, maxBy, minBy } from '../../../../shared/utils/array'
import { dateEndOf, dateParse, dateStartOf, DateUnit } from '../../../../shared/utils/date'
import { rpcClient } from '../../../api'
import { StockChartSeries } from '../../../components/StockChart'
import { assetTransactionsSeries } from './assetTransactions'
import type { ChartViewSeries } from './index'

export interface AssetSeriesConfig {
  type: 'asset'
  assetId: string
}

export const assetSeries: ChartViewSeries<AssetSeriesConfig> = async (
  resolution: DateUnit,
  config: AssetSeriesConfig
): Promise<StockChartSeries[]> => {
  const asset = await rpcClient.retrieveAsset({ id: config.assetId })
  const quotes = await rpcClient.listQuotesForAsset({ id: config.assetId })
  return [
    {
      type: 'candle',
      label: `${asset.symbol}/${asset.currency}`,
      points: groupBy(quotes, q => dateStartOf(dateParse(q.date), resolution).valueOf().toString()).map(quotes => {
        const openTimestamp = dateStartOf(dateParse(quotes[0].date), resolution)
        const closeTimestamp = dateEndOf(openTimestamp, resolution)
        const close = Number.parseFloat(quotes[quotes.length - 1].close)
        const open = quotes[0].open ? Number.parseFloat(quotes[0].open) : Number.parseFloat(quotes[0].close)
        const low = minBy(
          quotes.map(q => (q.low ? Number.parseFloat(q.low) : Number.parseFloat(q.close))),
          v => v
        )!
        const high = maxBy(
          quotes.map(q => (q.high ? Number.parseFloat(q.high) : Number.parseFloat(q.close))),
          v => v
        )!
        return {
          openTimestamp: openTimestamp.valueOf(),
          closeTimestamp: closeTimestamp.valueOf(),
          open,
          high,
          low,
          close,
        }
      }),
    },
    ...(await assetTransactionsSeries(resolution, { type: 'assetTransactions', assetId: config.assetId })),
  ]
}
