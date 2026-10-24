import postgres from 'postgres'

import { Categorization, categorizationSchema } from '../../shared/models/Categorization'
import { DatabaseEntity } from './DatabaseEntity'
import { randomId } from './id'

export class DatabaseCategorizations extends DatabaseEntity<Categorization, 'createdAt'> {
  protected override table = 'categorization'
  protected override schema = categorizationSchema

  public async listByUserId(userId: string, skip: number = 0, top: number = 2147483647): Promise<Categorization[]> {
    const rows = await this.sql`
      SELECT * FROM "categorization"
      WHERE "userId" = ${userId}
      ORDER BY "name", "id"
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => this.schema.parse(row))
  }

  public override async init(sql: postgres.TransactionSql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "categorization" (
        "id" VARCHAR(32) NOT NULL,
        "userId" VARCHAR(32) NOT NULL,
        "name" VARCHAR(128) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk__categorization__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `
  }

  protected override prepare(template: Omit<Categorization, 'id' | 'createdAt'>): Categorization {
    return {
      ...template,
      id: randomId('ctz'),
      createdAt: new Date().toISOString(),
    }
  }
}
