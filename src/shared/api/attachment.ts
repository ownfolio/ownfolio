import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import {
  attachmentParsedSchema,
  attachmentSchema,
  attachmentSearchResultSchema,
  attachmentSearchSchema,
} from '../models/Attachment'
import { fileSchema } from '../utils/file'
import { byIdSchemaFor, listResponseSchema, pagingParamsSchema, responseSchema } from '../utils/schemas'

export const rpcV1AttachmentDefinition = {
  listAttachments: createRpcCallDefinition(
    attachmentSearchSchema.extend(pagingParamsSchema.shape),
    listResponseSchema(attachmentSearchResultSchema)
  ),
  retrieveAttachment: createRpcCallDefinition(byIdSchemaFor('attachment'), responseSchema(attachmentSchema)),
  retrieveAttachmentContent: createRpcCallDefinition(
    byIdSchemaFor('attachment'),
    responseSchema(
      z.object({
        parsed: attachmentParsedSchema.nullable().describe('null if the document is not a recognized broker statement'),
      })
    )
  ),
  linkAttachmentToTransaction: createRpcCallDefinition(
    byIdSchemaFor('attachment').extend({ transactionId: z.string().describe('ID of the transaction') }),
    responseSchema(z.void())
  ),
  unlinkAttachmentFromTransaction: createRpcCallDefinition(
    byIdSchemaFor('attachment').extend({ transactionId: z.string().describe('ID of the transaction') }),
    responseSchema(z.void())
  ),
  deleteAttachment: createRpcCallDefinition(byIdSchemaFor('attachment'), responseSchema(z.void())),
  uploadAttachment: createRpcCallDefinition(fileSchema, responseSchema(attachmentSchema)),
  createAttachmentUploadUrl: createRpcCallDefinition(
    z.object({
      fileName: attachmentSchema.shape.fileName.describe(
        'File name the attachment is stored with, e.g. "statement.pdf"'
      ),
    }),
    responseSchema(
      z.object({
        uploadUrl: z.string().describe('URL to POST the raw PDF bytes to'),
        token: z
          .string()
          .describe('Single use token, sent as "Authorization: Bearer <token>" header. Never put it into the URL'),
        expiresAt: z.string().datetime().describe('Timestamp (ISO 8601) after which the token can no longer be used'),
        curlCommand: z
          .string()
          .describe('Ready to run upload command, only the path of the local file has to be filled in'),
      })
    )
  ),
  downloadAttachment: createRpcCallDefinition(byIdSchemaFor('attachment'), responseSchema(fileSchema)),
  downloadPdfAttachmentAsPngs: createRpcCallDefinition(byIdSchemaFor('attachment'), listResponseSchema(z.string())),
  downloadPdfAttachmentAsText: createRpcCallDefinition(byIdSchemaFor('attachment'), responseSchema(z.string())),
}
