import { OAuthClientInformationFull, OAuthClientInformationFullSchema } from '@modelcontextprotocol/sdk/shared/auth.js'
import crypto from 'crypto'
import postgres from 'postgres'

import { DatabaseTable } from './DatabaseTable'

const authorizationCodeLifetimeSeconds = 10 * 60
const accessTokenLifetimeSeconds = 60 * 60
const refreshTokenLifetimeSeconds = 30 * 24 * 60 * 60

export interface OAuthGrant {
  clientId: string
  userId: string
  scopes: string[]
  resource?: string
}

export interface OAuthAuthorizationCode extends OAuthGrant {
  codeChallenge: string
  redirectUri: string
}

export interface OAuthAccessToken extends OAuthGrant {
  expiresAt: number
}

export interface OAuthTokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  scopes: string[]
}

export class DatabaseOAuth extends DatabaseTable<OAuthClientInformationFull> {
  protected override table = 'oauth_client'
  protected override schema = OAuthClientInformationFullSchema

  async init(sql: postgres.TransactionSql<{}>): Promise<void> {
    await sql`
        CREATE TABLE "oauth_client" (
          "client_id" VARCHAR(256) NOT NULL,
          "information" JSONB NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          PRIMARY KEY ("client_id")
        )
      `
    await sql`
        CREATE TABLE "oauth_authorization_code" (
          "code_hash" VARCHAR(64) NOT NULL,
          "client_id" VARCHAR(256) NOT NULL,
          "userId" VARCHAR(32) NOT NULL,
          "code_challenge" VARCHAR(256) NOT NULL,
          "redirect_uri" TEXT NOT NULL,
          "scopes" TEXT NOT NULL,
          "resource" TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          PRIMARY KEY ("code_hash"),
          CONSTRAINT "fk__oauth_authorization_code__client_id__oauth_client__client_id" FOREIGN KEY("client_id") REFERENCES "oauth_client"("client_id") ON DELETE CASCADE,
          CONSTRAINT "fk__oauth_authorization_code__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
        )
      `
    await sql`
        CREATE TABLE "oauth_token" (
          "token_hash" VARCHAR(64) NOT NULL,
          "type" VARCHAR(16) NOT NULL,
          "client_id" VARCHAR(256) NOT NULL,
          "userId" VARCHAR(32) NOT NULL,
          "scopes" TEXT NOT NULL,
          "resource" TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          PRIMARY KEY ("token_hash"),
          CONSTRAINT "fk__oauth_token__client_id__oauth_client__client_id" FOREIGN KEY("client_id") REFERENCES "oauth_client"("client_id") ON DELETE CASCADE,
          CONSTRAINT "fk__oauth_token__userId__user__id" FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE
        )
      `
  }

  async findClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    const rows = await this.sql`SELECT "information" FROM "oauth_client" WHERE "client_id" = ${clientId}`
    return rows[0] ? this.schema.parse(rows[0].information) : undefined
  }

  async createClient(client: OAuthClientInformationFull): Promise<OAuthClientInformationFull> {
    const information = this.schema.parse(client)
    await this.sql`
      INSERT INTO "oauth_client" ("client_id", "information", "createdAt")
      VALUES (${information.client_id}, ${this.sql.json(JSON.parse(JSON.stringify(information)))}, ${new Date().toISOString()})
    `
    return information
  }

  async createAuthorizationCode(code: OAuthAuthorizationCode): Promise<string> {
    const value = randomToken('ofc')
    const createdAt = new Date()
    const expiresAt = new Date(createdAt.valueOf() + authorizationCodeLifetimeSeconds * 1000)
    await this.sql`
      INSERT INTO "oauth_authorization_code"
      ("code_hash", "client_id", "userId", "code_challenge", "redirect_uri", "scopes", "resource", "createdAt", "expires_at")
      VALUES (${hashToken(value)}, ${code.clientId}, ${code.userId}, ${code.codeChallenge}, ${code.redirectUri},
        ${code.scopes.join(' ')}, ${code.resource ?? null}, ${createdAt.toISOString()}, ${expiresAt.toISOString()})
    `
    return value
  }

  async findAuthorizationCode(clientId: string, value: string): Promise<OAuthAuthorizationCode | undefined> {
    const rows = await this.sql`
      SELECT * FROM "oauth_authorization_code"
      WHERE "code_hash" = ${hashToken(value)} AND "client_id" = ${clientId} AND "expires_at" > now()
    `
    return rows[0] ? rowToAuthorizationCode(rows[0]) : undefined
  }

  async consumeAuthorizationCode(clientId: string, value: string): Promise<OAuthAuthorizationCode | undefined> {
    await this.sql`DELETE FROM "oauth_authorization_code" WHERE "expires_at" < now()`
    const rows = await this.sql`
      DELETE FROM "oauth_authorization_code"
      WHERE "code_hash" = ${hashToken(value)} AND "client_id" = ${clientId}
      RETURNING *
    `
    return rows[0] ? rowToAuthorizationCode(rows[0]) : undefined
  }

  async createTokens(grant: OAuthGrant): Promise<OAuthTokenPair> {
    const accessToken = randomToken('ofa')
    const refreshToken = randomToken('ofr')
    const createdAt = new Date()
    await this.sql.begin(async sql => {
      for (const [type, value, lifetimeSeconds] of [
        ['access', accessToken, accessTokenLifetimeSeconds],
        ['refresh', refreshToken, refreshTokenLifetimeSeconds],
      ] as const) {
        const expiresAt = new Date(createdAt.valueOf() + lifetimeSeconds * 1000)
        await sql`
          INSERT INTO "oauth_token"
          ("token_hash", "type", "client_id", "userId", "scopes", "resource", "createdAt", "expires_at")
          VALUES (${hashToken(value)}, ${type}, ${grant.clientId}, ${grant.userId}, ${grant.scopes.join(' ')},
            ${grant.resource ?? null}, ${createdAt.toISOString()}, ${expiresAt.toISOString()})
        `
      }
    })
    return { accessToken, refreshToken, expiresIn: accessTokenLifetimeSeconds, scopes: grant.scopes }
  }

  async findAccessToken(value: string): Promise<OAuthAccessToken | undefined> {
    const rows = await this.sql`
      SELECT * FROM "oauth_token"
      WHERE "token_hash" = ${hashToken(value)} AND "type" = 'access' AND "expires_at" > now()
    `
    if (!rows[0]) {
      return undefined
    }
    return {
      ...rowToGrant(rows[0]),
      expiresAt: Math.floor(new Date(rows[0].expires_at).valueOf() / 1000),
    }
  }

  async consumeRefreshToken(clientId: string, value: string): Promise<OAuthGrant | undefined> {
    await this.sql`DELETE FROM "oauth_token" WHERE "expires_at" < now()`
    const rows = await this.sql`
      DELETE FROM "oauth_token"
      WHERE "token_hash" = ${hashToken(value)} AND "type" = 'refresh' AND "client_id" = ${clientId}
      RETURNING *
    `
    return rows[0] ? rowToGrant(rows[0]) : undefined
  }

  async revokeToken(clientId: string, value: string): Promise<void> {
    await this.sql`DELETE FROM "oauth_token" WHERE "token_hash" = ${hashToken(value)} AND "client_id" = ${clientId}`
  }
}

function randomToken(prefix: string): string {
  return prefix + '_' + crypto.randomBytes(32).toString('hex')
}

function hashToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function rowToGrant(row: postgres.Row): OAuthGrant {
  return {
    clientId: row.client_id,
    userId: row.userId,
    scopes: row.scopes ? row.scopes.split(' ') : [],
    resource: row.resource ?? undefined,
  }
}

function rowToAuthorizationCode(row: postgres.Row): OAuthAuthorizationCode {
  return {
    ...rowToGrant(row),
    codeChallenge: row.code_challenge,
    redirectUri: row.redirect_uri,
  }
}
