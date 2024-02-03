import postgres from 'postgres'

import { Asset, assetSchema } from '../../shared/models/Asset'
import { DatabaseEntity } from './DatabaseEntity'
import { randomId } from './id'

export class DatabaseAssets extends DatabaseEntity<Asset, 'createdAt'> {
  protected override table = 'asset'
  protected override schema = assetSchema

  public async listByUserId(userId: string, skip: number = 0, top: number = 2147483647): Promise<Asset[]> {
    const rows = await this.sql`
      SELECT * FROM "asset"
      WHERE "userId" = ${userId}
      ORDER BY "name", "id"
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => this.schema.parse(row))
  }

  public async updateQuoteProvider(assetId: string, quoteProvider: Asset['quoteProvider']): Promise<void> {
    await this.sql`UPDATE "asset" SET ${this.sql({ quoteProvider })} WHERE "id" = ${assetId}`
  }

  public override async init(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "asset" (
        "id" VARCHAR(32) NOT NULL,
        "userId" VARCHAR(32) NOT NULL,
        "name" VARCHAR(128) NOT NULL,
        "number" VARCHAR(128) NOT NULL,
        "symbol" VARCHAR(8) NOT NULL,
        "denomination" SMALLINT NOT NULL,
        "currency" VARCHAR(4) NOT NULL,
        "quoteProvider" JSONB,
        "status" VARCHAR(16) NOT NULL CHECK ("status" = 'active' OR "status" = 'inactive' OR "status" = 'hidden'),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk__asset__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `
  }

  protected override prepare(template: Omit<Asset, 'id' | 'createdAt'>): Asset {
    return {
      ...template,
      id: randomId('ast'),
      createdAt: new Date().toISOString(),
    }
  }
}
