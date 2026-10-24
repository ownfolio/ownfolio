import postgres from 'postgres'

import { Category, categorySchema } from '../../shared/models/Category'
import { DatabaseEntity } from './DatabaseEntity'
import { randomId } from './id'

export class DatabaseCategories extends DatabaseEntity<Category, 'createdAt'> {
  protected override table = 'category'
  protected override schema = categorySchema

  public async listByUserId(
    userId: string,
    categorizationId?: string,
    skip: number = 0,
    top: number = 2147483647
  ): Promise<Category[]> {
    const categorizationQ = categorizationId ? this.sql`c."categorizationId" = ${categorizationId}` : this.sql`true`
    const rows = await this.sql`
      SELECT c.* FROM "category" c
      LEFT JOIN "categorization" cz ON cz."id" = c."categorizationId"
      WHERE cz."userId" = ${userId} AND ${categorizationQ}
      ORDER BY c."name", c."id"
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => this.schema.parse(row))
  }

  public override async init(sql: postgres.TransactionSql<{}>): Promise<void> {
    // the composite foreign keys ensure that parents and assignments belong to the same categorization
    await sql`
      CREATE TABLE "category" (
        "id" VARCHAR(32) NOT NULL,
        "categorizationId" VARCHAR(32) NOT NULL,
        "parentCategoryId" VARCHAR(32),
        "name" VARCHAR(128) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "uq__category__categorizationId__id" UNIQUE ("categorizationId", "id"),
        CONSTRAINT "fk__category__categorizationId__categorization__id" FOREIGN KEY("categorizationId") REFERENCES "categorization"("id") ON DELETE CASCADE,
        CONSTRAINT "fk__category__parentCategoryId__category__id" FOREIGN KEY("categorizationId", "parentCategoryId") REFERENCES "category"("categorizationId", "id") ON DELETE CASCADE,
        CONSTRAINT "ck__category__parentCategoryId" CHECK ("parentCategoryId" IS NULL OR "parentCategoryId" != "id")
      )
    `
  }

  protected override prepare(template: Omit<Category, 'id' | 'createdAt'>): Category {
    return {
      ...template,
      id: randomId('cat'),
      createdAt: new Date().toISOString(),
    }
  }
}
