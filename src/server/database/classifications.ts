import postgres from 'postgres'

import {
  Classification,
  ClassificationAssignment,
  classificationAssignmentSchema,
  classificationSchema,
} from '../../shared/models/Classification'
import { DatabaseEntity } from './DatabaseEntity'
import { randomId } from './id'

export class DatabaseClassifications extends DatabaseEntity<Classification, 'createdAt'> {
  protected override table = 'classification'
  protected override schema = classificationSchema

  public async listByUserId(userId: string, skip: number = 0, top: number = 2147483647): Promise<Classification[]> {
    const rows = await this.sql`
      SELECT * FROM "classification"
      WHERE "userId" = ${userId}
      ORDER BY "name", "id"
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => this.schema.parse(row))
  }

  public async listAssignmentsByUserId(
    userId: string,
    skip: number = 0,
    top: number = 2147483647
  ): Promise<ClassificationAssignment[]> {
    const rows = await this.sql`
      SELECT "classification_assignment".* FROM "classification_assignment"
      JOIN "classification" ON "classification"."id" = "classification_assignment"."classificationId"
      WHERE "classification"."userId" = ${userId}
      ORDER BY "classificationId", "accountId", "assetId"
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => classificationAssignmentSchema.parse(row))
  }

  public async assignToClassification(
    id: string,
    accountId: string | null,
    assetId: string | null,
    weight: BigNumber
  ): Promise<void> {
    await this.sql`INSERT INTO "classification_assignment" ${this.sql({
      classificationId: id,
      accountId: accountId,
      assetId: assetId,
      weight: weight,
    })} ON CONFLICT DO NOTHING`
  }

  public async unassignFromClassification(id: string, accountId: string | null, assetId: string | null): Promise<void> {
    await this
      .sql`DELETE FROM "classification_assignment" WHERE "classificationId" = ${id} AND "accountId" = ${accountId} AND "assetId" = ${assetId}`
  }

  public override async init(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "classification" (
        "id" VARCHAR(32) NOT NULL,
        "userId" VARCHAR(32) NOT NULL,
        "parentClassificationId" VARCHAR(32),
        "name" VARCHAR(128) NOT NULL,
        "status" VARCHAR(16) NOT NULL CHECK ("status" = 'active' OR "status" = 'inactive' OR "status" = 'hidden'),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk__classification__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "fk__classification__parentClassificationId__classification__id" FOREIGN KEY("parentClassificationId") REFERENCES "classification"("id") ON DELETE CASCADE
      )
    `
    await sql`
      CREATE TABLE "classification_assignment" (
        "classificationId" VARCHAR(32) NOT NULL,
        "accountId" VARCHAR(32),
        "assetId" VARCHAR(32),
        "weight" DECIMAL,
        CHECK ("accountId" IS NOT NULL OR "assetId" IS NOT NULL),
        CHECK ("weight" >= 0 AND "weight" <= 100),
        CONSTRAINT "fk__classification_assignment__classificationId__classification__id" FOREIGN KEY("classificationId") REFERENCES "classification"("id") ON DELETE CASCADE,
        CONSTRAINT "fk__classification_assignment__accountId__account__id" FOREIGN KEY("accountId") REFERENCES "account"("id") ON DELETE CASCADE,
        CONSTRAINT "fk__classification_assignment__assetId__asset__id" FOREIGN KEY("assetId") REFERENCES "asset"("id") ON DELETE CASCADE
      )
    `
    await sql`CREATE UNIQUE INDEX "idx__classification_assignment__classificationId_accountId_assetId" ON "classification_assignment"("classificationId", "accountId", "assetId")`
  }

  protected override prepare(template: Omit<Classification, 'id' | 'createdAt'>): Classification {
    return {
      ...template,
      id: randomId('ast'),
      createdAt: new Date().toISOString(),
    }
  }
}
