import { z } from 'zod'

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
