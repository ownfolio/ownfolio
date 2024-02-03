import postgres from 'postgres'
import { z } from 'zod'

export abstract class DatabaseTable {
  protected abstract table: string
  protected abstract schema: z.ZodTypeAny

  public constructor(protected sql: postgres.Sql<{}>) {}

  public abstract init(sql: postgres.Sql<{}>): Promise<void>
}
