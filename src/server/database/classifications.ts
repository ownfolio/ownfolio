import postgres from 'postgres'

import {
  Classification,
  ClassificationBucket,
  ClassificationBucketAssignment,
  classificationBucketAssignmentSchema,
  classificationBucketSchema,
  classificationSchema,
} from '../../shared/models/Classification'
import { DatabaseEntity } from './DatabaseEntity'
import { randomId } from './id'

export class DatabaseClassifications extends DatabaseEntity<Classification, 'createdAt'> {
  protected override table = 'classification'
  protected override schema = classificationSchema

  public async listByUserId(userId: string): Promise<Classification[]> {
    const rows = await this.sql`
      SELECT * FROM "classification"
      WHERE "userId" = ${userId}
      ORDER BY "name", "id"
    `
    return rows.map(row => this.schema.parse(row))
  }

  protected override prepare(template: Omit<Classification, 'id' | 'createdAt'>): Classification {
    return {
      ...template,
      id: randomId('cls'),
      createdAt: new Date().toISOString(),
    }
  }

  public async listBucketsByClassificationId(classificationId: string): Promise<ClassificationBucket[]> {
    const rows = await this.sql`
      SELECT * FROM "classification_bucket"
      WHERE "classificationId" = ${classificationId}
      ORDER BY "sortOrder", "name", "id"
    `
    return rows.map(row => classificationBucketSchema.parse(row))
  }

  public async findBucket(id: string): Promise<ClassificationBucket | undefined> {
    const rows = await this.sql`SELECT * FROM "classification_bucket" WHERE "id" = ${id}`
    return rows.length > 0 ? classificationBucketSchema.parse(rows[0]) : undefined
  }

  public async createBucket(template: Omit<ClassificationBucket, 'id' | 'createdAt'>): Promise<ClassificationBucket> {
    const bucket: ClassificationBucket = classificationBucketSchema.parse({
      ...template,
      id: randomId('clb'),
      createdAt: new Date().toISOString(),
    })
    await this.sql`INSERT INTO "classification_bucket" ${this.sql(bucket as any)}`
    return bucket
  }

  public async updateBucket(bucket: ClassificationBucket): Promise<ClassificationBucket> {
    const bucket2 = classificationBucketSchema.parse(bucket)
    await this.sql`UPDATE "classification_bucket" SET ${this.sql(bucket2 as any)} WHERE "id" = ${bucket2.id}`
    return bucket2
  }

  public async deleteBucket(id: string): Promise<void> {
    await this.sql`DELETE FROM "classification_bucket" WHERE "id" = ${id}`
  }

  public async listAssignmentsByClassificationId(classificationId: string): Promise<ClassificationBucketAssignment[]> {
    const rows = await this.sql`
      SELECT * FROM "classification_bucket_assignment"
      WHERE "classificationId" = ${classificationId}
    `
    return rows.map(row => classificationBucketAssignmentSchema.parse(row))
  }

  public async listAllAssignmentsByUserId(userId: string): Promise<ClassificationBucketAssignment[]> {
    const rows = await this.sql`
      SELECT cba.* FROM "classification_bucket_assignment" cba
      JOIN "classification" c ON c."id" = cba."classificationId"
      WHERE c."userId" = ${userId}
    `
    return rows.map(row => classificationBucketAssignmentSchema.parse(row))
  }

  public async listAssignmentsByBucketId(bucketId: string): Promise<ClassificationBucketAssignment[]> {
    const rows = await this.sql`
      SELECT * FROM "classification_bucket_assignment"
      WHERE "bucketId" = ${bucketId}
    `
    return rows.map(row => classificationBucketAssignmentSchema.parse(row))
  }

  public async setAssignment(
    classificationId: string,
    entityType: 'asset' | 'account',
    entityId: string,
    bucketId: string | null
  ): Promise<void> {
    if (bucketId === null) {
      await this.sql`
        DELETE FROM "classification_bucket_assignment"
        WHERE "classificationId" = ${classificationId}
          AND "entityType" = ${entityType}
          AND "entityId" = ${entityId}
      `
    } else {
      const assignment = classificationBucketAssignmentSchema.parse({
        bucketId,
        classificationId,
        entityType,
        entityId,
        createdAt: new Date().toISOString(),
      })
      await this.sql`
        INSERT INTO "classification_bucket_assignment" ${this.sql(assignment as any)}
        ON CONFLICT ("classificationId", "entityType", "entityId")
        DO UPDATE SET "bucketId" = ${bucketId}, "createdAt" = ${assignment.createdAt}
      `
    }
  }

  public override async init(sql: postgres.TransactionSql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "classification" (
        "id" VARCHAR(32) NOT NULL,
        "userId" VARCHAR(32) NOT NULL,
        "name" VARCHAR(128) NOT NULL,
        "status" VARCHAR(16) NOT NULL CHECK ("status" IN ('active', 'inactive', 'hidden')),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk__classification__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `
    await sql`
      CREATE TABLE "classification_bucket" (
        "id" VARCHAR(32) NOT NULL,
        "classificationId" VARCHAR(32) NOT NULL,
        "parentBucketId" VARCHAR(32),
        "name" VARCHAR(128) NOT NULL,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk__cb__classificationId__classification__id" FOREIGN KEY("classificationId") REFERENCES "classification"("id") ON DELETE CASCADE,
        CONSTRAINT "fk__cb__parentBucketId__cb__id" FOREIGN KEY("parentBucketId") REFERENCES "classification_bucket"("id") ON DELETE CASCADE
      )
    `
    await sql`
      CREATE TABLE "classification_bucket_assignment" (
        "bucketId" VARCHAR(32) NOT NULL,
        "classificationId" VARCHAR(32) NOT NULL,
        "entityType" VARCHAR(16) NOT NULL CHECK ("entityType" IN ('asset', 'account')),
        "entityId" VARCHAR(32) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        UNIQUE ("classificationId", "entityType", "entityId"),
        CONSTRAINT "fk__cba__bucketId__cb__id" FOREIGN KEY("bucketId") REFERENCES "classification_bucket"("id") ON DELETE CASCADE,
        CONSTRAINT "fk__cba__classificationId__classification__id" FOREIGN KEY("classificationId") REFERENCES "classification"("id") ON DELETE CASCADE
      )
    `
  }
}
