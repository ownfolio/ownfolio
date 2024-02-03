import postgres from 'postgres'

import { Account, accountSchema } from '../../shared/models/Account'
import { DatabaseEntity } from './DatabaseEntity'
import { randomId } from './id'

export class DatabaseAccounts extends DatabaseEntity<Account, 'createdAt'> {
  protected override table = 'account'
  protected override schema = accountSchema

  public async listByUserId(userId: string, skip: number = 0, top: number = 2147483647): Promise<Account[]> {
    const rows = await this.sql`
      SELECT a.* FROM "account" a
      LEFT JOIN "portfolio" p ON p."id" = a."portfolioId"
      WHERE p."userId" = ${userId}
      ORDER BY a."name", a."id"
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => this.schema.parse(row))
  }

  public override async init(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "account" (
        "id" VARCHAR(32) NOT NULL,
        "portfolioId" VARCHAR(32) NOT NULL,
        "name" VARCHAR(128) NOT NULL,
        "number" VARCHAR(128) NOT NULL,
        "currency" VARCHAR(4) NOT NULL,
        "status" VARCHAR(16) NOT NULL CHECK ("status" = 'active' OR "status" = 'inactive' OR "status" = 'hidden'),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk__account__portfolioId__portfolio__id" FOREIGN KEY("portfolioId") REFERENCES "portfolio"("id") ON DELETE CASCADE
      )
    `
  }

  protected override prepare(template: Omit<Account, 'id' | 'createdAt'>): Account {
    return {
      ...template,
      id: randomId('act'),
      createdAt: new Date().toISOString(),
    }
  }
}
