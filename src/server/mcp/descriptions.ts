import { allTransactionTypes } from '../../shared/models/Transaction'

export const mcpServerInstructions = `ownfolio is a personal portfolio tracker. All data belongs to the authenticated user.

Domain model:
- Portfolios group accounts (e.g. "Retirement", "Trading").
- Accounts belong to a portfolio and represent a bank or broker account. One account can hold cash and asset units at the same time.
- Assets are instruments (stocks, ETFs, crypto, ...). They belong to the user, not to an account.
- Transactions are the single source of truth. Holdings, cash balances, cost basis and profits are never stored but derived by replaying all transactions in chronological order (date, then time). Asset units are matched first in, first out (FIFO).
- Quotes are daily close prices per asset unit and are used to value holdings.
- Attachments are uploaded PDFs (e.g. broker statements) that can be linked to transactions as evidence.

Conventions:
- Every successful call returns JSON of the shape {"data": ...}.
- Decimal amounts are strings with a dot as decimal separator (e.g. "1234.56"). Always pass amounts as strings to avoid rounding.
- All transaction amounts are positive, the transaction type determines the direction. Cash amounts are in the currency of the respective account.
- Dates are YYYY-MM-DD, times are local HH:mm:ss.
- IDs are opaque strings. Look them up with the list* tools instead of guessing.

Typical workflows:
- Current holdings and their value: evaluatePositions, combined with listAssets and listAccounts to resolve names.
- Total value or profit over time: evaluateSummary.
- Uploading a local file: createAttachmentUploadUrl, then run the returned curlCommand with the file path filled in. Only use uploadAttachment for very small files, since its file content has to be passed inline as base64. If you cannot run commands, ask the user to upload the file in the web app and look it up with listAttachments.
- Recording a trade from a broker statement: upload it (see above), downloadPdfAttachmentAsText or retrieveAttachmentContent to read it, createTransaction, then linkAttachmentToTransaction. Afterwards evaluatePlausibility reports conflicts between transactions and their attachments.
- Before creating a transaction, make sure the referenced accounts and assets exist (listAccounts, listAssets) and create them if needed.`

// Every MCP tool needs a description, `index.test.ts` verifies that none is missing.
export const mcpToolDescriptions: Record<string, string> = {
  ping: 'Check that the server is reachable. Returns no data.',
  version: 'Return the version of the ownfolio server.',

  me: 'Return the authenticated user (ID, email, registration date).',
  changeEmail:
    'Change the email address of the authenticated user. Requires the current password. Only use when the user explicitly asks for it. Returns the updated user.',
  changePassword:
    'Change the password of the authenticated user. Requires the current password. Only use when the user explicitly asks for it. Logs out all web sessions and revokes the access of all MCP clients, including this one, which then has to be authorized again.',
  exportUserTransactionsAsCsv:
    'Export all transactions of the user as CSV file (data URL). Accounts and assets are referenced by name. Columns: Date, Time, Type, AssetAccount, Asset, AssetAmount, FromAssetAccount, ToAssetAccount, CashAccount, CashAmount, FromCashAccount, ToCashAccount, FeeCashAmount, TaxCashAmount, FeeAssetAmount, Reference, Comment.',
  importUserTransactionsFromCsv:
    'Import transactions from a CSV file (data URL with MIME type text/csv) in the format of exportUserTransactionsAsCsv. Creates a new portfolio "Import" and creates accounts and assets referenced by unknown names in it. Does not deduplicate, importing the same file twice duplicates all transactions.',

  listPortfolios: 'List all portfolios of the user, ordered by name.',
  retrievePortfolio: 'Retrieve a single portfolio by ID.',
  createPortfolio: 'Create a portfolio. Returns the created portfolio including its ID.',
  updatePortfolio:
    'Replace all fields of an existing portfolio. Pass the complete portfolio as returned by retrievePortfolio.',
  updatePortfolioStatus: 'Change only the status of a portfolio (active, inactive or hidden).',
  deletePortfolio:
    'Delete a portfolio and all its accounts. Fails if any of its accounts is used by a transaction. Cannot be undone.',

  listAccounts: 'List all accounts of the user across all portfolios, ordered by name.',
  retrieveAccount: 'Retrieve a single account by ID.',
  createAccount: 'Create an account in a portfolio. Returns the created account including its ID.',
  updateAccount:
    'Replace all fields of an existing account. Pass the complete account as returned by retrieveAccount. The currency cannot be changed once the account has transactions.',
  updateAccountStatus: 'Change only the status of an account (active, inactive or hidden).',
  deleteAccount: 'Delete an account. Fails if the account is used by any transaction. Cannot be undone.',

  listAssets: 'List all assets of the user, ordered by name.',
  retrieveAsset: 'Retrieve a single asset by ID.',
  createAsset:
    'Create an asset. Set quoteProvider to fetch quotes automatically, otherwise maintain quotes with updateQuoteForAsset. Returns the created asset including its ID.',
  updateAsset:
    'Replace all fields of an existing asset. Pass the complete asset as returned by retrieveAsset. The currency cannot be changed once the asset has transactions or quotes.',
  updateAssetStatus: 'Change only the status of an asset (active, inactive or hidden).',
  deleteAsset: 'Delete an asset and its quotes. Fails if the asset is used by any transaction. Cannot be undone.',

  listTransactions:
    'Search transactions, newest first. All filters are optional and combined with AND. Each result includes the IDs of its linked attachments.',
  retrieveTransaction: 'Retrieve a single transaction by ID.',
  createTransaction: `Create a transaction. The data field depends on the type (${allTransactionTypes.map(t => t.type).join(', ')}), see the schema descriptions for how each type changes cash and holdings. Returns the created transaction including its ID.`,
  updateTransaction:
    'Replace all fields of an existing transaction. Pass the complete transaction as returned by retrieveTransaction, including fields that do not change.',
  deleteTransaction:
    'Delete a transaction. Links to attachments are removed, the attachments are kept. Cannot be undone.',

  listLatestQuotes:
    'List the latest quote of every asset of the user, optionally as of a date. Assets without any quote are omitted.',
  listQuotesForAsset: 'List all quotes of an asset, ordered by date ascending.',
  retrieveQuoteForAsset:
    'Retrieve the latest quote of an asset on or before a date, or null if there is none. The returned quote can be older than the requested date.',
  updateQuoteForAsset: 'Create or replace the quote of an asset for a date. Returns no data.',
  deleteQuoteForAsset: 'Delete the quote of an asset for a date. Returns no data.',
  updateQuotes:
    'Fetch new quotes for all assets that have a quote provider. An asset is fetched at most every 30 minutes. Returns the IDs of the assets that were updated.',

  listAttachments:
    'List attachments ordered by file name, optionally only those linked to a transaction. Each result includes the IDs of its linked transactions.',
  retrieveAttachment: 'Retrieve the metadata of a single attachment by ID.',
  retrieveAttachmentContent:
    'Return the data the server extracted from a broker statement PDF (type assetBuy or assetSell with date, time, asset, assetAmount, assetPrice as total price, fee, tax, total and reference), or null if the document was not recognized.',
  linkAttachmentToTransaction:
    'Link an attachment to a transaction. An attachment can be linked to several transactions.',
  unlinkAttachmentFromTransaction: 'Remove the link between an attachment and a transaction. Both are kept.',
  deleteAttachment: 'Delete an attachment and its links to transactions. Cannot be undone.',
  uploadAttachment:
    'Upload a PDF document passed inline as base64 data URL (MIME type application/pdf). Only suitable for very small files, prefer createAttachmentUploadUrl. Returns the created attachment including its ID.',
  createAttachmentUploadUrl:
    'Create a single use upload URL for a PDF, valid for 15 minutes. Use this instead of uploadAttachment whenever you can run commands: execute the returned curlCommand after replacing /path/to/file.pdf with the local file path. The command prints {"data": <attachment>} with the ID of the created attachment. Files up to 10 MB are accepted.',
  downloadAttachment: 'Download the original file of an attachment as data URL.',
  downloadPdfAttachmentAsPngs:
    'Render each page of a PDF attachment as PNG image. Returns one data URL per page. Prefer downloadPdfAttachmentAsText unless the layout matters.',
  downloadPdfAttachmentAsText: 'Extract the plain text of a PDF attachment.',

  evaluateBalances:
    'Return the raw balance at one or more dates: every open and closed cash and asset lot with cost basis and proceeds, the quotes used and detected issues. Prefer evaluatePositions or evaluateSummary, which aggregate this data.',
  evaluateSummary:
    'Compute aggregated values (total, deposit, cash, assetsOpenPrice, assetsCurrentPrice, realizedProfits) for groups of accounts at one or more dates. Result: data.value maps each bucket key ("all", a portfolio ID or an account ID) to rows of the form [date, value1, value2, ...] with the values as decimal strings in the order requested. Total minus deposit is the realized and unrealized price gain; interest and dividends count as deposit, fees and taxes reduce it.',
  evaluatePositions:
    'Return the asset holdings at a date, grouped by account and asset. openAssetPositions are currently held units with amount, openPrice (cost basis) and currentPrice (market value based on the latest quote up to the date, cost basis if there is none); closedAssetPositions are sold or withdrawn units with openPrice and closePrice (proceeds before fees and taxes). Prices are totals for all units, not per unit. Each group lists its individual FIFO lots in positions.',
  evaluatePlausibility:
    'Check all transactions for problems, ordered by date: buys and sells without linked attachment (info), buys and sells whose fields differ from the data parsed from a linked broker statement (warning, with expected and actual value per field), and transactions removing more units of an asset from an account than it holds at that point (error, with the missing units as excessiveAssetAmount; usually a missing or misdated earlier buy, deposit or transfer).',

  generateReport: 'Generate a PDF report as data URL.',

  retrieveDefaultDashboard:
    'Return the layout of the start page of the web app, created with defaults on first access.',
  updateDefaultDashboard:
    'Replace the layout of the start page of the web app. Pass the complete dashboard as returned by retrieveDefaultDashboard.',
}
