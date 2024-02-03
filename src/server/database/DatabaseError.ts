import postgres from 'postgres'

export type DatabaseErrorType = 'unknown'

export class DatabaseError extends Error {
  readonly reason: DatabaseErrorType

  constructor(message: string, reason: DatabaseErrorType) {
    super(message)
    this.name = 'DatabaseError'
    this.reason = reason
  }

  static unknown = (name: string, id: string) => new DatabaseError(`Unknown ${name} ${id}`, 'unknown')

  static ensureHit(rows: postgres.RowList<postgres.Row[]>, name: string, id: string): void {
    if (rows.count === 0) {
      throw this.unknown(name, id)
    }
  }
}
