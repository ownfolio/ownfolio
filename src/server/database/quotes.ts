import postgres from 'postgres'

import { Quote, quoteSchema } from '../../shared/models/Quote'
import { chunks } from '../../shared/utils/array'
import { sequential } from '../../shared/utils/promise'
import { DatabaseTable } from './DatabaseTable'

export class DatabaseQuotes extends DatabaseTable<Quote> {
  protected override table = 'quote'
  protected override schema = quoteSchema

  async init(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "quote" (
        "assetId" VARCHAR(32) NOT NULL,
        "date" DATE NOT NULL,
        "open" DECIMAL,
        "high" DECIMAL,
        "low" DECIMAL,
        "close" DECIMAL NOT NULL,
        PRIMARY KEY ("assetId", "date"),
        CONSTRAINT "fk__quote__assetId__asset__id" FOREIGN KEY("assetId") REFERENCES "asset"("id") ON DELETE CASCADE
      )
    `
  }

  async createOrUpdate(...quotes: Quote[]): Promise<Quote[]> {
    const quotes2 = quotes.map(quote => this.schema.parse(quote))
    await sequential(
      chunks(quotes2, 1000).map(chunk => async () => {
        await this.sql`
        INSERT INTO "quote" ${this.sql(chunk)}
        ON CONFLICT ON CONSTRAINT "quote_pkey" DO UPDATE SET "open" = EXCLUDED."open", "high" = EXCLUDED."high", "low" = EXCLUDED."low", "close" = EXCLUDED."close"
      `
      })
    )
    return quotes2
  }

  async delete(assetId: string, date: string): Promise<void> {
    await this.sql`DELETE FROM "quote" WHERE "assetId" = ${assetId} AND "date" = ${date}`
  }

  async listByAssetId(assetId: string): Promise<Quote[]> {
    const rows = await this.sql`SELECT * FROM "quote" WHERE "assetId" = ${assetId} ORDER BY "date"`
    return rows.map(row => this.schema.parse(row))
  }

  async listAllClosesByUserId(userId: string): Promise<Quote[]> {
    const rows = await this.sql`
      SELECT q."assetId", q."date", q."close" FROM "quote" q
      LEFT JOIN "asset" a on a."id" = q."assetId"
      WHERE a."userId" = ${userId}
      ORDER BY q."assetId", q."date" ASC
    `
    return rows.map(row => this.schema.parse(row))
  }

  async listLatestClosesByUserId(userId: string, date?: string): Promise<Quote[]> {
    const dateFilter = date ? this.sql`AND q."date" <= ${date}` : this.sql``
    const rows = await this.sql`
      SELECT DISTINCT ON (q."assetId") q.* FROM "quote" q
      LEFT JOIN "asset" a on a."id" = q."assetId"
      WHERE a."userId" = ${userId} ${dateFilter}
      ORDER BY q."assetId", q."date" DESC
    `
    return rows.map(row => this.schema.parse(row))
  }

  async countForAssetId(assetId: string): Promise<number> {
    const [{ count }] = await this.sql<{ count: number }[]>`
      SELECT count(1)::int "count" FROM "quote"
      WHERE "assetId" = ${assetId}
    `
    return count
  }
}
