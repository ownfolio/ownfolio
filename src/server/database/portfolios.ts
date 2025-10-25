import postgres from 'postgres'

import { Portfolio, portfolioSchema } from '../../shared/models/Portfolio'
import { DatabaseEntity } from './DatabaseEntity'
import { randomId } from './id'

export class DatabasePortfolios extends DatabaseEntity<Portfolio, 'createdAt'> {
  protected override table = 'portfolio'
  protected override schema = portfolioSchema

  public async listByUserId(userId: string, skip: number = 0, top: number = 2147483647): Promise<Portfolio[]> {
    const rows = await this.sql`
      SELECT * FROM "portfolio"
      WHERE "userId" = ${userId}
      ORDER BY "name", "id"
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => this.schema.parse(row))
  }

  public override async init(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "portfolio" (
        "id" VARCHAR(32) NOT NULL,
        "userId" VARCHAR(32) NOT NULL,
        "name" VARCHAR(128) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk__portfolio__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `
  }

  public async addStatusColumn(sql: postgres.Sql<{}>): Promise<void> {
    await sql`ALTER TABLE "portfolio" ADD COLUMN "status" VARCHAR(16) NOT NULL CHECK ("status" = 'active' OR "status" = 'inactive' OR "status" = 'hidden') DEFAULT 'active'`
  }

  protected override prepare(template: Omit<Portfolio, 'id' | 'createdAt'>): Portfolio {
    return {
      ...template,
      id: randomId('port'),
      createdAt: new Date().toISOString(),
    }
  }
}
