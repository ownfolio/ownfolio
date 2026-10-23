// @vitest-environment node
import { execFile } from 'child_process'
import express from 'express'
import fs from 'fs/promises'
import http from 'http'
import { AddressInfo } from 'net'
import path from 'path'
import { promisify } from 'util'
import { describe, expect, it } from 'vitest'

import { Config } from '../config'
import { Database } from '../database'
import { databaseTest } from '../database/databaseTest'
import { createApi, createRpcV1 } from '.'

const pdfPath = path.resolve(__dirname, '../pdf/parse/ingDiBa/test-sell.pdf')

describe('attachment upload', () => {
  it(
    'uploads with the curl command returned by createAttachmentUploadUrl',
    databaseTest(async db => {
      await db.init()
      const user = await db.users.create({ email: 'user@domain.com' }, 'password')
      await withServer(db, async rpcV1 => {
        const ctx = { user, setSessionId: async () => {}, unsetSessionId: async () => {} }
        const { data: upload } = await rpcV1.createAttachmentUploadUrl.handler(ctx, { fileName: 'statement.pdf' })
        expect(upload.uploadUrl).not.toContain(upload.token)

        const command = upload.curlCommand.replace('/path/to/file.pdf', pdfPath)
        const { stdout } = await promisify(execFile)('sh', ['-c', command])
        const { data: attachment } = JSON.parse(stdout)
        expect(attachment).toMatchObject({ userId: user.id, fileName: 'statement.pdf', mimeType: 'application/pdf' })
        await expect(db.attachments.read(attachment.id)).resolves.toEqual(await fs.readFile(pdfPath))
        const { data: content } = await rpcV1.retrieveAttachmentContent.handler(ctx, { id: attachment.id })
        expect(content.parsed).toMatchObject({ type: 'assetSell' })

        await expect(promisify(execFile)('sh', ['-c', command])).rejects.toMatchObject({
          stdout: expect.stringContaining('already used'),
        })
      })
    }),
    60000
  )

  it(
    'rejects invalid requests',
    databaseTest(async db => {
      await db.init()
      const user = await db.users.create({ email: 'user@domain.com' }, 'password')
      await withServer(db, async rpcV1 => {
        const ctx = { user, setSessionId: async () => {}, unsetSessionId: async () => {} }
        const { data: upload } = await rpcV1.createAttachmentUploadUrl.handler(ctx, { fileName: 'statement.pdf' })
        const pdf = await fs.readFile(pdfPath)
        const post = (headers: Record<string, string>, body: Buffer) =>
          fetch(upload.uploadUrl, { method: 'POST', headers, body: new Uint8Array(body) })
        const auth = { Authorization: `Bearer ${upload.token}` }

        expect((await post({ 'Content-Type': 'application/pdf' }, pdf)).status).toBe(401)
        expect(
          (await post({ Authorization: 'Bearer ofu_unknown', 'Content-Type': 'application/pdf' }, pdf)).status
        ).toBe(401)
        expect((await post({ ...auth, 'Content-Type': 'text/plain' }, pdf)).status).toBe(400)
        expect((await post({ ...auth, 'Content-Type': 'application/pdf' }, Buffer.from('not a pdf'))).status).toBe(400)
        expect(
          (
            await post(
              { ...auth, 'Content-Type': 'application/pdf' },
              Buffer.concat([pdf, Buffer.alloc(11 * 1024 * 1024)])
            )
          ).status
        ).toBe(413)
        await expect(db.attachments.listByUserId(user.id)).resolves.toEqual([])

        // rejected requests do not consume the token
        expect((await post({ ...auth, 'Content-Type': 'application/pdf' }, pdf)).status).toBe(201)

        const expired = await db.attachments.createUploadToken(user.id, 'expired.pdf', -1)
        expect(
          (await post({ Authorization: `Bearer ${expired.token}`, 'Content-Type': 'application/pdf' }, pdf)).status
        ).toBe(401)
        await expect(db.attachments.listByUserId(user.id)).resolves.toMatchObject([{ fileName: 'statement.pdf' }])
      })
    }),
    60000
  )
})

async function withServer(
  database: Database,
  fn: (rpcV1: ReturnType<typeof createRpcV1>) => Promise<void>
): Promise<void> {
  const app = express()
  const server = http.createServer(app)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const config: Config = {
      httpPort: 0,
      publicUrl: `http://localhost:${(server.address() as AddressInfo).port}`,
      userRegistrationEnabled: false,
      trustProxyHops: 0,
      publicDirectory: '',
    }
    app.use(await createApi(database, config))
    await fn(createRpcV1(database, config))
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}
