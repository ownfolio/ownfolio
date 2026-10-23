import { z } from 'zod'

import { bigNumberSchema, dateStringSchema, timeStringSchema } from '../utils/schemas'

export const attachmentSchema = z
  .object({
    id: z.string().describe('ID of the attachment'),
    userId: z.string().describe('ID of the owning user'),
    fileName: z.string().trim().min(1).max(128).describe('Original file name'),
    mimeType: z.string().trim().min(1).max(128).describe('MIME type, currently always application/pdf'),
    size: z.number().describe('File size in bytes'),
    createdAt: z.string().datetime().describe('Upload timestamp (ISO 8601)'),
  })
  .describe('An uploaded document, typically a broker statement PDF, that can be linked to transactions as evidence')

export type Attachment = z.infer<typeof attachmentSchema>

export const attachmentSearchSchema = z.object({
  transactionId: z.string().optional().describe('Only return attachments linked to this transaction'),
})

export type AttachmentSearch = z.infer<typeof attachmentSearchSchema>

export const attachmentSearchResultSchema = attachmentSchema.extend({
  transactionIds: z.array(z.string()).describe('IDs of the transactions this attachment is linked to'),
})

export type AttachmentSearchResult = z.infer<typeof attachmentSearchResultSchema>

const attachmentParsedTradeShape = {
  date: dateStringSchema.optional().describe('Execution date (YYYY-MM-DD)'),
  time: timeStringSchema.optional().describe('Execution time'),
  currency: z.string().optional().describe('Currency of the amounts, e.g. "EUR"'),
  asset: z
    .array(z.string())
    .optional()
    .describe('Names and identifiers (e.g. ISIN, WKN) of the asset, to be matched against name and number of assets'),
  assetAmount: bigNumberSchema.optional().describe('Number of units traded'),
  assetPrice: bigNumberSchema
    .optional()
    .describe('Total price of all units before fees and taxes, corresponds to cashAmount of the transaction'),
  assetAccount: z
    .array(z.string())
    .optional()
    .describe('Identifiers of the account holding the asset, to be matched against account numbers'),
  fee: bigNumberSchema.optional().describe('Fees, corresponds to feeCashAmount of the transaction'),
  total: bigNumberSchema.optional().describe('Total amount debited or credited on the cash account'),
  account: z
    .array(z.string())
    .optional()
    .describe('Identifiers of the cash account, to be matched against account numbers'),
  reference: z.string().optional().describe('Order or booking number, corresponds to reference of the transaction'),
}

export const attachmentParsedSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('assetBuy'), ...attachmentParsedTradeShape }),
    z.object({
      type: z.literal('assetSell'),
      ...attachmentParsedTradeShape,
      tax: bigNumberSchema.optional().describe('Taxes, corresponds to taxCashAmount of the transaction'),
    }),
  ])
  .describe('Data extracted from a recognized broker statement, fields that could not be found are missing')

export type AttachmentParsed = z.infer<typeof attachmentParsedSchema>

export function createEmptyAttachment(): Attachment {
  return {
    id: '',
    userId: '',
    fileName: '',
    mimeType: '',
    size: 0,
    createdAt: '',
  }
}
