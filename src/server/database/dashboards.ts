import postgres from 'postgres'

import { Dashboard, dashboardRowSchema, dashboardSchema } from '../../shared/models/Dashboard'
import { arrayIgnoringErrorsSchema } from '../../shared/utils/schemas'
import { DatabaseEntity } from './DatabaseEntity'
import { randomId } from './id'

export class DatabaseDashboards extends DatabaseEntity<Dashboard> {
  protected override table = 'dashboard'
  protected override schema = dashboardSchema.extend({
    rows: arrayIgnoringErrorsSchema(dashboardRowSchema),
  })

  public async retriveUserIdAndKey(userId: string, key: string): Promise<Dashboard | undefined> {
    const rows = await this.sql`
      SELECT d.* FROM "dashboard" d
      WHERE d."userId" = ${userId} AND d."key" = ${key}
    `
    return rows[0] ? this.schema.parse(rows[0]) : undefined
  }

  public async listByUserId(userId: string, skip: number = 0, top: number = 2147483647): Promise<Dashboard[]> {
    const rows = await this.sql`
      SELECT d.* FROM "dashboard" d
      WHERE d."userId" = ${userId}
      ORDER BY d."id"
      OFFSET ${skip} LIMIT ${top}
    `
    return rows.map(row => this.schema.parse(row))
  }

  public override async init(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
      CREATE TABLE "dashboard" (
        "id" VARCHAR(32) NOT NULL,
        "userId" VARCHAR(32) NOT NULL,
        "key" VARCHAR(128) NOT NULL CHECK ("key" != ''),
        "rows" JSONB NOT NULL,
        PRIMARY KEY ("id", "userId"),
        CONSTRAINT "fk_dashboard__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `
    await sql`CREATE UNIQUE INDEX "idx__dashboard__user_id__key" ON "dashboard"("userId", "key")`
  }

  protected override prepare(template: Omit<Dashboard, 'id' | 'createdAt'>): Dashboard {
    return {
      ...template,
      id: randomId('dhb'),
    }
  }
}
