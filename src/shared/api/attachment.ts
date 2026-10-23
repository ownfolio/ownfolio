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
  downloadAttachment: createRpcCallDefinition(byIdSchemaFor('attachment'), responseSchema(fileSchema)),
  downloadPdfAttachmentAsPngs: createRpcCallDefinition(byIdSchemaFor('attachment'), listResponseSchema(z.string())),
  downloadPdfAttachmentAsText: createRpcCallDefinition(byIdSchemaFor('attachment'), responseSchema(z.string())),
}
