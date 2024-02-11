import postgres from 'postgres'

import {
  Attachment,
  attachmentSchema,
  AttachmentSearch,
  AttachmentSearchResult,
  attachmentSearchResultSchema,
} from '../../shared/models/Attachment'
import { logger } from '../logger'
import { pdfParse } from '../pdf/parse'
import { pdfToConcatenatedPngs } from '../pdf/pdfToPngs'
import { pdfToText } from '../pdf/pdfToText'
import { createPromisePool } from '../promisePool'
import { DatabaseEntity } from './DatabaseEntity'
import { DatabaseError } from './DatabaseError'
import { randomId } from './id'

export class DatabaseAttachments extends DatabaseEntity<Attachment, 'createdAt'> {
  protected override table = 'attachment'
  protected override schema = attachmentSchema

  public override async init(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "attachment" (
        "id" VARCHAR(32) NOT NULL,
        "userId" VARCHAR(32) NOT NULL,
        "fileName" VARCHAR(128) NOT NULL,
        "mimeType" VARCHAR(128) NOT NULL,
        "size" INT NOT NULL CHECK ("size" > 0),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk__attachment__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `
    await sql`
      CREATE TABLE "attachment_bytes" (
        "attachmentId" VARCHAR(32) NOT NULL,
        "bytes" BYTEA NOT NULL,
        PRIMARY KEY ("attachmentId"),
        CONSTRAINT "fk__attachment_bytes__attachmentId__attachment__id" FOREIGN KEY("attachmentId") REFERENCES "attachment"("id") ON DELETE CASCADE
      )
    `
    await sql`
      CREATE TABLE "attachment_transaction_link" (
        "attachmentId" VARCHAR(32) NOT NULL,
        "transactionId" VARCHAR(32) NOT NULL,
        PRIMARY KEY ("attachmentId", "transactionId"),
        CONSTRAINT "fk__attachment_transaction_link__attachmentId__attachment__id" FOREIGN KEY("attachmentId") REFERENCES "attachment"("id") ON DELETE CASCADE,
        CONSTRAINT "fk__attachment_transaction_link__transactionId__transaction__id" FOREIGN KEY("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE
      )
    `
  }

  public async addContentTable(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "attachment_content" (
        "attachmentId" VARCHAR(32) NOT NULL,
        "text" TEXT NOT NULL,
        "parsed" JSONB,
        PRIMARY KEY ("attachmentId"),
        CONSTRAINT "fk__attachment_content__attachmentId__attachment__id" FOREIGN KEY("attachmentId") REFERENCES "attachment"("id") ON DELETE CASCADE
      )
    `
  }

  public async addDerivationCacheTable(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "attachment_derivation_cache" (
        "attachmentId" VARCHAR(32) NOT NULL,
        "key" VARCHAR(256) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "bytes" BYTEA NOT NULL,
        PRIMARY KEY ("attachmentId", "key"),
        CONSTRAINT "fk__attachment_bytes__attachmentId__attachment__id" FOREIGN KEY("attachmentId") REFERENCES "attachment"("id") ON DELETE CASCADE
      )
    `
  }

  public async dropContentTable(sql: postgres.Sql<{}>): Promise<void> {
    await sql`DROP TABLE "attachment_content"`
  }

  public async addDerivationCacheMimeTypeColumn(sql: postgres.Sql<{}>): Promise<void> {
    await sql`TRUNCATE TABLE "attachment_derivation_cache"`
    await sql`ALTER TABLE "attachment_derivation_cache" ADD COLUMN "mimeType" VARCHAR(128) NOT NULL`
  }

  public async makeDerivationCacheExpiryOptional(sql: postgres.Sql<{}>): Promise<void> {
    await sql`ALTER TABLE "attachment_derivation_cache" ALTER COLUMN "expiresAt" DROP NOT NULL`
  }

  public async listByUserId(
    userId: string,
    search?: AttachmentSearch,
    skip: number = 0,
    top: number = 2147483647
  ): Promise<AttachmentSearchResult[]> {
    const transactionIdFilter = search?.transactionId ? this.sql`AND t.id = ${search.transactionId}` : this.sql``
    const rows = await this.sql`
      SELECT
          a.*,
          (SELECT array_agg(atl."transactionId") FROM "attachment_transaction_link" atl WHERE atl."attachmentId" = a."id") "transactionIds"
      FROM "attachment" a
      LEFT JOIN "attachment_transaction_link" atl ON atl."attachmentId" = a."id" 
      LEFT JOIN "transaction" t ON t."id" = atl."transactionId"
      WHERE a."userId" = ${userId} ${transactionIdFilter}
      GROUP BY a."id"
      ORDER BY a."fileName", a."id"
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => attachmentSearchResultSchema.parse({ ...row, transactionIds: row.transactionIds || [] }))
  }

  public async linkToTransaction(id: string, transactionId: string): Promise<void> {
    await this.sql`INSERT INTO "attachment_transaction_link" ${this.sql({
      attachmentId: id,
      transactionId,
    })} ON CONFLICT DO NOTHING`
  }

  public async unlinkFromTransaction(id: string, transactionId: string): Promise<void> {
    await this
      .sql`DELETE FROM "attachment_transaction_link" WHERE "attachmentId" = ${id} AND "transactionId" = ${transactionId}`
  }

  public async createAndWrite(userId: string, fileName: string, mimeType: string, bytes: Buffer): Promise<Attachment> {
    const attachment = await this.sql.begin(async sql => {
      const attachment: Attachment = this.prepare({
        userId,
        fileName,
        mimeType,
        size: bytes.length,
      })
      await sql`INSERT INTO ${sql('attachment')} ${sql(attachment)}`
      await sql`INSERT INTO ${sql('attachment_bytes')} ${sql({ attachmentId: attachment.id, bytes })}`
      return attachment
    })
    await this.regenerateDefaultDerivations(attachment)
    return attachment
  }

  public async read(id: string): Promise<Buffer> {
    const rows = await this.sql`SELECT * FROM ${this.sql('attachment_bytes')} WHERE "attachmentId" = ${id}`
    DatabaseError.ensureHit(rows, this.table, id)
    const bytes = rows[0].bytes
    return Buffer.from(bytes)
  }

  public async readDerivation(
    id: string,
    key: string,
    mimeType: string,
    fn: (bytes: Buffer) => Promise<Buffer>,
    ttl?: number,
    refresh?: boolean
  ): Promise<Buffer> {
    await this
      .sql`DELETE FROM ${this.sql('attachment_derivation_cache')} WHERE "expiresAt" IS NOT NULL AND "expiresAt" < now()`
    if (!refresh) {
      const existingDerivation = await this
        .sql`SELECT * FROM ${this.sql('attachment_derivation_cache')} WHERE "attachmentId" = ${id} AND "key" = ${key}`
      if (existingDerivation.length > 0) {
        return existingDerivation[0].bytes
      }
    }
    const derivedBytes = await this.read(id).then(fn)
    const expiresAt = ttl ? new Date(Date.now() + ttl).toISOString() : null
    await this.sql`
      INSERT INTO ${this.sql('attachment_derivation_cache')}
      ${this.sql({ attachmentId: id, key, mimeType, bytes: derivedBytes, expiresAt })}
      ON CONFLICT ON CONSTRAINT "attachment_derivation_cache_pkey" DO UPDATE SET "mimeType" = EXCLUDED."mimeType", "bytes" = EXCLUDED."bytes", "expiresAt" = EXCLUDED."expiresAt"
    `
    return derivedBytes
  }

  public async readDerivationIfExists(id: string, key: string): Promise<Buffer | undefined> {
    await this
      .sql`DELETE FROM ${this.sql('attachment_derivation_cache')} WHERE "expiresAt" IS NOT NULL AND "expiresAt" < now()`
    const existingDerivation = await this
      .sql`SELECT * FROM ${this.sql('attachment_derivation_cache')} WHERE "attachmentId" = ${id} AND "key" = ${key}`
    return existingDerivation.length > 0 ? existingDerivation[0].bytes : undefined
  }

  public async listDerivations(ids: string[], key: string): Promise<[string, Buffer][]> {
    const rows = await this
      .sql`SELECT "attachmentId", "bytes" FROM ${this.sql('attachment_derivation_cache')} WHERE "attachmentId" = ANY(${ids}) AND "key" = ${key}`
    return rows.map(row => [row.attachmentId, row.bytes])
  }

  public async regenerateDefaultDerivations(attachment: Attachment): Promise<void> {
    await Promise.all(
      this.defaultDerivations(attachment.mimeType).map(async ([key, mimeType, fn]) => {
        await this.readDerivation(attachment.id, key, mimeType, fn, undefined, true).catch(error => {
          logger.error(`Unable to create attachment derivation ${key}`, { error })
        })
      })
    )
  }

  public async regenerateAllDefaultDerivations(): Promise<void> {
    const attachments = await this.list()
    const promisePool = createPromisePool(4)
    await Promise.all(
      attachments.map(attachment =>
        promisePool(() => {
          logger.info(`Regenerating default derivations for attachment ${attachment.id}`)
          return this.regenerateDefaultDerivations(attachment)
        })
      )
    )
  }

  private defaultDerivations(mimeType: string): [string, string, (buf: Buffer) => Promise<Buffer>][] {
    switch (mimeType) {
      case 'application/pdf':
        return [
          [
            'pdfToConcatenatedPngs',
            'image/png',
            async (pdf: Buffer) => {
              const pngs = pdfToConcatenatedPngs(pdf)
              return pngs
            },
          ],
          [
            'pdfToTextRaw',
            'text/plain',
            async (pdf: Buffer) => {
              const text = await pdfToText(pdf, 'raw')
              return Buffer.from(text, 'utf-8')
            },
          ],
          [
            'pdfToTextLayout',
            'text/plain',
            async (pdf: Buffer) => {
              const text = await pdfToText(pdf, 'layout')
              return Buffer.from(text, 'utf-8')
            },
          ],
          [
            'pdfParse',
            'application/json',
            async (pdf: Buffer) => {
              const text = await pdfToText(pdf)
              const parsed = pdfParse(text)
              const json = JSON.stringify(parsed)
              return Buffer.from(json, 'utf-8')
            },
          ],
        ]
      default:
        return []
    }
  }

  protected override prepare(template: Omit<Attachment, 'id' | 'createdAt'>): Attachment {
    return {
      ...template,
      id: randomId('attm'),
      createdAt: new Date().toISOString(),
    }
  }
}
