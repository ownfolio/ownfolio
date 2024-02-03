import postgres from 'postgres'

import { Transaction, transactionSchema, TransactionSearch } from '../../shared/models/Transaction'
import { DatabaseEntity } from './DatabaseEntity'
import { randomId } from './id'

export class DatabaseTransactions extends DatabaseEntity<Transaction, 'createdAt'> {
  protected override table = 'transaction'
  protected override schema = transactionSchema

  public async listByUserId(
    userId: string,
    search?: TransactionSearch,
    order: 'asc' | 'desc' = 'desc',
    skip: number = 0,
    top: number = 2147483647
  ): Promise<Transaction[]> {
    const typeFilterQ = search?.type ? this.sql`"data" -> 'type' = ${search.type}` : this.sql`true`
    const fromDateFilterQ = search?.fromDate ? this.sql`"date" >= ${search.fromDate}` : this.sql`true`
    const toDateFilterQ = search?.toDate ? this.sql`"date" <= ${search.toDate}` : this.sql`true`
    const portfolioQ = search?.portfolioId
      ? this
          .sql`"data"::text LIKE ANY(SELECT CONCAT('%', "id", '%') FROM "account" WHERE "portfolioId" = ${search.portfolioId})`
      : this.sql`true`
    const accountQ = search?.accountId ? this.sql`"data"::text LIKE ${'%' + search.accountId + '%'}` : this.sql`true`
    const assetQ = search?.assetId ? this.sql`"data"::text LIKE ${'%' + search.assetId + '%'}` : this.sql`true`
    const referenceFilterQ = search?.reference ? this.sql`"reference" = ${search.reference}` : this.sql`true`
    const orderQ = order === 'desc' ? this.sql`DESC` : this.sql`ASC`
    const rows = await this.sql`
      SELECT * FROM "transaction"
      WHERE "userId" = ${userId} AND ${typeFilterQ} AND ${fromDateFilterQ} AND ${portfolioQ} AND ${accountQ} AND ${assetQ} AND ${toDateFilterQ} AND ${referenceFilterQ}
      ORDER BY "date" ${orderQ}, "time" ${orderQ}, "id" ${orderQ}
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => this.schema.parse(row))
  }

  public async countForPortfolioId(portfolioId: string): Promise<number> {
    const userIdRes = await this.sql<{ userId: string }[]>`SELECT "userId" FROM "portfolio" WHERE "id" = ${portfolioId}`
    const userId = userIdRes[0]?.userId
    if (!userId) {
      return 0
    }
    const accountQ = this
      .sql`"data"::text LIKE ANY(SELECT CONCAT('%', "id", '%') FROM "account" WHERE "portfolioId" = ${portfolioId})`
    const [{ count }] = await this.sql<{ count: number }[]>`
      SELECT count(1)::int "count" FROM "transaction"
      WHERE "userId" = ${userId} AND (${accountQ})
    `
    return count
  }

  public async countForAccountId(accountId: string): Promise<number> {
    const userIdRes = await this.sql<
      { userId: string }[]
    >`SELECT p."userId" FROM "account" a LEFT JOIN "portfolio" p ON p."id" = a."portfolioId" WHERE a."id" = ${accountId}`
    const userId = userIdRes[0]?.userId
    if (!userId) {
      return 0
    }
    const accountQ = this.sql`"data"::text LIKE ${'%' + accountId + '%'}`
    const [{ count }] = await this.sql<{ count: number }[]>`
      SELECT count(1)::int "count" FROM "transaction"
      WHERE "userId" = ${userId} AND (${accountQ})
    `
    return count
  }

  public async countForAssetId(assetId: string): Promise<number> {
    const userIdRes = await this.sql<{ userId: string }[]>`SELECT "userId" FROM "asset" WHERE "id" = ${assetId}`
    const userId = userIdRes[0]?.userId
    if (!userId) {
      return 0
    }
    const assetQ = this.sql`"data"::text LIKE ${'%' + assetId + '%'}`
    const [{ count }] = await this.sql<{ count: number }[]>`
      SELECT count(1)::int "count" FROM "transaction"
      WHERE "userId" = ${userId} AND (${assetQ})
    `
    return count
  }

  public override async init(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "transaction" (
        "id" VARCHAR(32) NOT NULL,
        "userId" VARCHAR(32) NOT NULL,
        "date" DATE NOT NULL,
        "time" TIME NOT NULL,
        "data" JSONB NOT NULL,
        "reference" VARCHAR(64) NOT NULL,
        "comment" TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk__transaction__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `
  }

  protected override prepare(template: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    return {
      ...template,
      id: randomId('tx'),
      createdAt: new Date().toISOString(),
    }
  }
}
