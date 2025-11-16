import postgres from 'postgres'
import { z } from 'zod'

export abstract class DatabaseTable<E> {
  protected abstract table: string
  protected abstract schema: z.Schema<E>

  public constructor(protected sql: postgres.Sql<{}>) {}

  public abstract init(sql: postgres.Sql<{}>): Promise<void>
}
