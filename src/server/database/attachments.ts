import postgres from 'postgres'
import { z } from 'zod'

import {
  Attachment,
  AttachmentContent,
  attachmentContentSchema,
  attachmentSchema,
} from '../../shared/models/Attachment'
import { extractAttachmentContent } from './attachmentContentParsers'
import { DatabaseEntity } from './DatabaseEntity'
import { DatabaseError } from './DatabaseError'
import { randomId } from './id'

export const attachmentSearchSchema = z.object({
  transactionId: z.string().optional(),
})

export type AttachmentSearch = z.infer<typeof attachmentSearchSchema>

export const attachmentSearchResultSchema = attachmentSchema.extend({ transactionCount: z.number() })

export type AttachmentSearchResult = z.infer<typeof attachmentSearchResultSchema>

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
    const attachments = await sql<
      { id: string; mimeType: string; bytes: Buffer }[]
    >`SELECT a."id", a."mimeType", ab."bytes" FROM "attachment" a JOIN "attachment_bytes" ab ON ab."attachmentId" = a."id"`
    for (let i = 0; i < attachments.length; i++) {
      const content = await extractAttachmentContent(attachments[i].mimeType, attachments[i].bytes)
      await sql`INSERT INTO "attachment_content" ${sql({ attachmentId: attachments[i].id, ...content })}`
    }
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
          (SELECT count(1)::int FROM "attachment_transaction_link" atl WHERE atl."attachmentId" = a."id") "transactionCount"
      FROM "attachment" a
      LEFT JOIN "attachment_transaction_link" atl ON atl."attachmentId" = a."id" 
      LEFT JOIN "transaction" t ON t."id" = atl."transactionId"
      WHERE a."userId" = ${userId} ${transactionIdFilter}
      GROUP BY a."id"
      ORDER BY a."fileName", a."id"
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => attachmentSearchResultSchema.parse(row))
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
      const content = await extractAttachmentContent(mimeType, bytes)
      await sql`INSERT INTO ${sql('attachment')} ${sql(attachment)}`
      await sql`INSERT INTO ${sql('attachment_bytes')} ${sql({ attachmentId: attachment.id, bytes })}`
      if (content) {
        await sql`INSERT INTO ${sql('attachment_content')} ${sql({ attachmentId: attachment.id, ...content })}`
      }
      return attachment
    })
    return attachment
  }

  public async read(id: string): Promise<Buffer> {
    const rows = await this.sql`SELECT * FROM ${this.sql('attachment_bytes')} WHERE "attachmentId" = ${id}`
    DatabaseError.ensureHit(rows, this.table, id)
    const bytes = rows[0].bytes
    return Buffer.from(bytes)
  }

  public async content(id: string): Promise<AttachmentContent | null> {
    const rows = await this.sql`SELECT * FROM ${this.sql('attachment_content')} WHERE "attachmentId" = ${id}`
    return rows.length > 0 ? attachmentContentSchema.parse(rows[0]) : null
  }

  protected override prepare(template: Omit<Attachment, 'id' | 'createdAt'>): Attachment {
    return {
      ...template,
      id: randomId('attm'),
      createdAt: new Date().toISOString(),
    }
  }
}
