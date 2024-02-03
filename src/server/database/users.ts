import crypto from 'crypto'
import postgres from 'postgres'

import { User, userSchema } from '../../shared/models/User'
import { hashPassword, verifyPassword } from '../password'
import { DatabaseError } from './DatabaseError'
import { DatabaseTable } from './DatabaseTable'
import { randomId } from './id'

export class DatabaseUsers extends DatabaseTable {
  protected override table = 'user'
  protected override schema = userSchema

  async init(sql: postgres.Sql<{}>): Promise<void> {
    await sql`
        CREATE TABLE "user" (
          "id" VARCHAR(32) NOT NULL,
          "email" VARCHAR(256) NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          PRIMARY KEY ("id")
        )
      `
    await sql`CREATE UNIQUE INDEX "idx__user__email" ON "user"("email")`
    await sql`
        CREATE TABLE "user_password" (
          "userId" VARCHAR(32),
          "hash" VARCHAR(512),
          "createdAt" TIMESTAMP WITH TIME ZONE,
          PRIMARY KEY ("userId"),
          CONSTRAINT "fk__user_password__userId__users__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
        )
      `
    await sql`
        CREATE TABLE "user_session" (
          "session_id" VARCHAR(128),
          "userId" VARCHAR(32),
          "remember_me" BOOLEAN,
          "createdAt" TIMESTAMP WITH TIME ZONE,
          "expires_at" TIMESTAMP WITH TIME ZONE,
          PRIMARY KEY ("session_id"),
          CONSTRAINT "fk__user_session__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
        )
      `
  }

  async count(): Promise<number> {
    const [{ count }] = await this.sql<{ count: number }[]>`SELECT count(1)::int "count" FROM "user"`
    return count
  }

  async create(template: Omit<User, 'id' | 'createdAt'>, password: string): Promise<User> {
    return this.sql.begin(async sql => {
      const user: User = this.schema.parse(this.prepare(template))
      await sql`INSERT INTO "user" ${this.sql(user)}`
      const hash = await hashPassword(password)
      await sql`
        INSERT INTO "user_password"
        ("userId", "hash", "createdAt")
        VALUES (${user.id}, ${hash}, ${new Date().toISOString()})`
      return user
    })
  }

  async retrieve(id: string): Promise<User> {
    const rows = await this.sql`SELECT * FROM "user" WHERE "id" = ${id}`
    DatabaseError.ensureHit(rows, this.table, id)
    return this.schema.parse(rows[0])
  }

  async find(id: string): Promise<User | undefined> {
    const rows = await this.sql`SELECT * FROM "user" WHERE "id" = ${id}`
    return rows[0] ? this.schema.parse(rows[0]) : undefined
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const rows = await this.sql`SELECT * FROM "user" WHERE "email" = ${email.toLowerCase()}`
    return rows[0] ? this.schema.parse(rows[0]) : undefined
  }

  async update(user: User): Promise<User> {
    const user2 = this.schema.parse(user)
    const res = await this.sql`UPDATE "user" SET ${this.sql(user2)} WHERE "id" = ${user2.id}`
    DatabaseError.ensureHit(res, this.table, user2.id)
    return user2
  }

  async delete(id: string): Promise<void> {
    const res = await this.sql`DELETE FROM "user" WHERE "id" = ${id}`
    if (res.count === 0) {
      throw new Error(`Unknown user ${id}`)
    }
  }

  async setPassword(userId: string, password: string): Promise<void> {
    const hash = await hashPassword(password)
    await this.sql`
      INSERT INTO
        "user_password" ("userId", "hash", "createdAt")
      VALUES
        (${userId}, ${hash}, ${new Date().toISOString()})
      ON CONFLICT ("userId")
      DO UPDATE SET
        "hash" = ${hash}, "createdAt" = ${new Date().toISOString()}
    `
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      const row = await this.sql`SELECT "hash" FROM "user_password" WHERE "userId" = ${userId}`
      if (!row[0]) {
        return false
      }
      const storedHash = row[0].hash
      return verifyPassword(storedHash, password)
    } catch (err) {
      return false
    }
  }

  async clearData(userId: string): Promise<void> {
    await this.sql.begin(async sql => {
      await sql`DELETE FROM "portfolio" WHERE "userId" = ${userId}`
      await sql`DELETE FROM "asset" WHERE "userId" = ${userId}`
      await sql`DELETE FROM "transaction" WHERE "userId" = ${userId}`
      await sql`DELETE FROM "attachment" WHERE "userId" = ${userId}`
    })
  }

  async createSession(userId: string, rememberMe: boolean): Promise<string> {
    const sessionIdNonce = crypto.randomBytes(32)
    const sessionId = 'sess_' + sessionIdNonce.toString('hex')
    const createdAt = new Date()
    const expiresAt = rememberMe
      ? new Date(createdAt.valueOf() + 30 * 24 * 60 * 60 * 1000)
      : new Date(createdAt.valueOf() + 60 * 60 * 1000)
    await this.sql`
      INSERT INTO "user_session" ("session_id", "userId", "remember_me", "createdAt", "expires_at")
      VALUES (${sessionId}, ${userId}, ${rememberMe}, ${createdAt.toISOString()}, ${expiresAt.toISOString()})
    `
    return sessionId
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.sql`DELETE FROM "user_session" WHERE "session_id" = ${sessionId}`
  }

  async renewSession(sessionId: string): Promise<boolean | undefined> {
    await this.sql`DELETE FROM "user_session" WHERE "expires_at" < now()`
    const raw = await this.sql`SELECT "remember_me" FROM "user_session" WHERE "session_id" = ${sessionId}`
    if (!raw[0]) {
      return undefined
    }
    const rememberMe = raw[0].remember_me === true
    const expiresAt = rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 60 * 60 * 1000)
    await this
      .sql`UPDATE "user_session" SET "expires_at" = ${expiresAt.toISOString()} WHERE "session_id" = ${sessionId}`
    return rememberMe
  }

  async findBySessionId(sessionId: string): Promise<User | undefined> {
    await this.sql`DELETE FROM "user_session" WHERE "expires_at" < now()`
    const rows = await this.sql`
      SELECT u.* FROM "user" u
      LEFT JOIN "user_session" s ON s."userId" = u."id"
      WHERE s."session_id" = ${sessionId}
    `
    return rows[0] ? this.schema.parse(rows[0]) : undefined
  }

  protected prepare(template: Omit<User, 'id' | 'createdAt'>): User {
    return {
      ...template,
      id: randomId('user'),
      createdAt: new Date().toISOString(),
    }
  }
}
