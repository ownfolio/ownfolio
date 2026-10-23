import express from 'express'

import { Database } from '../database'
import { logger } from '../logger'
import { isPdf } from '../pdf/utils'

export const attachmentUploadPath = '/api/attachments/upload'

const maxUploadSize = '10mb'

// Plain HTTP upload for attachments, authenticated with a single use token from the createAttachmentUploadUrl RPC call.
// It is the documented exception to "all operations go through the RPC router": MCP tool arguments are written by the
// model, so files cannot be passed through them, but agents can run a command like curl to send the file directly.
// The token is sent as header instead of being part of the URL, since URLs end up in request logs.
export function createAttachmentUpload(database: Database): express.Router {
  const router = express.Router()

  router.post(attachmentUploadPath, express.raw({ type: () => true, limit: maxUploadSize }), async (req, res) => {
    try {
      const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1]
      if (!token) {
        res.status(401).json({ error: 'Missing upload token, send it as "Authorization: Bearer <token>"' })
        return
      }
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
      // the body is checked before the token is consumed, so a rejected request can be retried with the same token
      if (!req.is('application/pdf') || !isPdf(body)) {
        res.status(400).json({ error: 'Only accepts PDFs, sent with "Content-Type: application/pdf"' })
        return
      }
      const upload = await database.attachments.consumeUploadToken(token)
      if (!upload) {
        res.status(401).json({ error: 'Upload token is invalid, expired or already used' })
        return
      }
      const attachment = await database.attachments.createAndWrite(
        upload.userId,
        upload.fileName,
        'application/pdf',
        body
      )
      logger.info(`Uploaded attachment ${attachment.id}`, { userId: upload.userId })
      res.status(201).json({ data: attachment })
    } catch (error) {
      logger.error('Uploading attachment failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  })
  router.use(
    attachmentUploadPath,
    (error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') {
        res.status(413).json({ error: `Files must not be larger than ${maxUploadSize}` })
      } else {
        next(error)
      }
    }
  )

  return router
}
