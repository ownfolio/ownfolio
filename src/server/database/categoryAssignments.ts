import postgres from 'postgres'

import {
  CategoryAssignment,
  categoryAssignmentSchema,
  CategoryAssignmentTarget,
} from '../../shared/models/CategoryAssignment'
import { DatabaseTable } from './DatabaseTable'
import { randomId } from './id'

export class DatabaseCategoryAssignments extends DatabaseTable<CategoryAssignment> {
  protected override table = 'category_assignment'
  protected override schema = categoryAssignmentSchema

  public async listByUserId(userId: string, categorizationId?: string): Promise<CategoryAssignment[]> {
    const categorizationQ = categorizationId ? this.sql`ca."categorizationId" = ${categorizationId}` : this.sql`true`
    const rows = await this.sql`
      SELECT ca.* FROM "category_assignment" ca
      LEFT JOIN "categorization" cz ON cz."id" = ca."categorizationId"
      WHERE cz."userId" = ${userId} AND ${categorizationQ}
      ORDER BY ca."categorizationId", ca."accountId" NULLS FIRST, ca."assetId" NULLS FIRST, ca."createdAt", ca."id"
    `
    return rows.map(row => this.schema.parse(row))
  }

  // replaces all assignments of the target within the categorization
  public async replace(
    categorizationId: string,
    target: CategoryAssignmentTarget,
    assignments: Pick<CategoryAssignment, 'categoryId' | 'fraction'>[]
  ): Promise<CategoryAssignment[]> {
    const createdAt = new Date().toISOString()
    const entities = assignments.map(a =>
      this.schema.parse({
        id: randomId('cas'),
        categorizationId,
        categoryId: a.categoryId,
        accountId: target.accountId,
        assetId: target.assetId,
        fraction: a.fraction,
        createdAt,
      })
    )
    await this.sql.begin(async sql => {
      await sql`
        DELETE FROM "category_assignment"
        WHERE "categorizationId" = ${categorizationId}
          AND "accountId" IS NOT DISTINCT FROM ${target.accountId}
          AND "assetId" IS NOT DISTINCT FROM ${target.assetId}
      `
      if (entities.length > 0) {
        await sql`INSERT INTO "category_assignment" ${sql(entities)}`
      }
    })
    return entities
  }

  public override async init(sql: postgres.TransactionSql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "category_assignment" (
        "id" VARCHAR(32) NOT NULL,
        "categorizationId" VARCHAR(32) NOT NULL,
        "categoryId" VARCHAR(32) NOT NULL,
        "accountId" VARCHAR(32),
        "assetId" VARCHAR(32),
        "fraction" DECIMAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk__category_assignment__categoryId__category__id" FOREIGN KEY("categorizationId", "categoryId") REFERENCES "category"("categorizationId", "id") ON DELETE CASCADE,
        CONSTRAINT "fk__category_assignment__accountId__account__id" FOREIGN KEY("accountId") REFERENCES "account"("id") ON DELETE CASCADE,
        CONSTRAINT "fk__category_assignment__assetId__asset__id" FOREIGN KEY("assetId") REFERENCES "asset"("id") ON DELETE CASCADE,
        CONSTRAINT "ck__category_assignment__target" CHECK ("accountId" IS NOT NULL OR "assetId" IS NOT NULL),
        CONSTRAINT "ck__category_assignment__fraction" CHECK ("fraction" > 0 AND "fraction" <= 1)
      )
    `
    await sql`
      CREATE UNIQUE INDEX "idx__category_assignment__categoryId__accountId__assetId"
      ON "category_assignment"("categoryId", COALESCE("accountId", ''), COALESCE("assetId", ''))
    `
  }
}
