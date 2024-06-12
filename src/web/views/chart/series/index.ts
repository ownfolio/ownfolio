import { DateUnit } from '../../../../shared/utils/date'
import { StockChartSeries } from '../../../components/StockChart'
import { assetSeries, AssetSeriesConfig } from './asset'
import { assetTransactionsSeries, AssetTransactionsSeriesConfig } from './assetTransactions'
import { profitSeries, ProfitSeriesConfig } from './profit'
import { totalSeries, TotalSeriesConfig } from './total'
import { totalDepositSeries, TotalDepositSeriesConfig } from './totalDeposit'

export type ChartViewSeries<C> = (resolution: DateUnit, config: C) => Promise<StockChartSeries[]>

export type ChartViewSeriesConfig =
  | TotalSeriesConfig
  | TotalDepositSeriesConfig
  | ProfitSeriesConfig
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
    case 'asset':
      return assetSeries(resolution, config)
    case 'assetTransactions':
      return assetTransactionsSeries(resolution, config)
  }
}

export function isChartViewSeriesPrivate(config: ChartViewSeriesConfig): boolean {
  switch (config.type) {
    case 'total':
      return true
    case 'totalDeposit':
      return true
    case 'profit':
      return true
    case 'asset':
      return false
    case 'assetTransactions':
      return false
  }
}
