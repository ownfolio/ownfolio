import BigNumber from 'bignumber.js'

import { dateParse, DateUnit } from '../../../../shared/utils/date'
import { rpcClient } from '../../../api'
import { StockChartSeries } from '../../../components/StockChart'
import type { ChartViewSeries } from './index'

export interface AssetTransactionsSeriesConfig {
  type: 'assetTransactions'
  assetId: string
}

export const assetTransactionsSeries: ChartViewSeries<AssetTransactionsSeriesConfig> = async (
  _resolution: DateUnit,
  config: AssetTransactionsSeriesConfig
): Promise<StockChartSeries[]> => {
  const asset = await rpcClient.retrieveAsset({ id: config.assetId }).then(r => r.data)
  const transactions = await rpcClient.listTransactions({}).then(r => r.data)
  return [
    {
      id: `asset-transactions-${asset.symbol}`,
      type: 'point',
      label: `${asset.symbol}/${asset.currency} Buy/Sell`,
      points: transactions.flatMap(tx => {
        switch (tx.data.type) {
          case 'assetBuy':
            if (tx.data.assetId === config.assetId) {
              const dayStart = dateParse(`${tx.date}T${tx.time}`)
              const dayMiddle = new Date(dayStart.valueOf() + 12 * 60 * 60 * 1000)
              return {
                timestamp: dayMiddle.valueOf(),
                value: BigNumber(tx.data.cashAmount).dividedBy(tx.data.assetAmount).toNumber(),
              }
            }
            break
          case 'assetSell':
            if (tx.data.assetId === config.assetId) {
              const dayStart = dateParse(`${tx.date}T${tx.time}`)
              const dayMiddle = new Date(dayStart.valueOf() + 12 * 60 * 60 * 1000)
              return {
                timestamp: dayMiddle.valueOf(),
                value: BigNumber(tx.data.cashAmount).dividedBy(tx.data.assetAmount).toNumber(),
              }
            }
            break
          case 'assetDeposit':
            if (tx.data.assetId === config.assetId) {
              const dayStart = dateParse(`${tx.date}T${tx.time}`)
              const dayMiddle = new Date(dayStart.valueOf() + 12 * 60 * 60 * 1000)
              return {
                timestamp: dayMiddle.valueOf(),
                value: BigNumber(tx.data.cashAmount).dividedBy(tx.data.assetAmount).toNumber(),
              }
            }
            break
          case 'assetWithdrawal':
            if (tx.data.assetId === config.assetId) {
              const dayStart = dateParse(`${tx.date}T${tx.time}`)
              const dayMiddle = new Date(dayStart.valueOf() + 12 * 60 * 60 * 1000)
              return {
                timestamp: dayMiddle.valueOf(),
                value: BigNumber(tx.data.cashAmount).dividedBy(tx.data.assetAmount).toNumber(),
              }
            }
            break
        }
        return []
      }),
    },
  ]
}
