import { rpcV1AccountDefinition } from './account'
import { rpcV1AssetDefinition } from './asset'
import { rpcV1AttachmentDefinition } from './attachment'
import { rpcV1BalanceDefinition } from './balance'
import { rpcV1DashboardDefinition } from './dashboard'
import { rpcV1EvaluationsDefinition } from './evaluations'
import { rpcV1PortfolioDefinition } from './portfolio'
import { rpcV1QuoteDefinition } from './quote'
import { rpcV1ReportDefinition } from './report'
import { rpcV1TransactionDefinition } from './transaction'
import { rpcV1UserDefinition } from './user'

export const rpcV1Definition = {
  ...rpcV1AccountDefinition,
  ...rpcV1AssetDefinition,
  ...rpcV1AttachmentDefinition,
  ...rpcV1BalanceDefinition,
  ...rpcV1EvaluationsDefinition,
  ...rpcV1PortfolioDefinition,
  ...rpcV1QuoteDefinition,
  ...rpcV1ReportDefinition,
  ...rpcV1TransactionDefinition,
  ...rpcV1UserDefinition,
  ...rpcV1DashboardDefinition,
}
